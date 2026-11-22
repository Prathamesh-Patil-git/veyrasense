"""Shared temporal anomaly, hypothesis, diagnosis, fingerprint, recovery, and trust pipeline."""
import json
import statistics
from datetime import timezone
from typing import Any
from sqlalchemy import select
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database.models.measurement import Measurement
from app.database.models.node import SensorNode
from app.database.models.research_record import ResearchRecord
from app.database.models.scenario_run import ScenarioRun
from app.database.models.sensor import Sensor
from app.database.models.sensor_profile import SensorProfile
from app.core.config import settings

HYPOTHESES = ("sensor_fault", "physical_event", "communication_fault", "environmental_disturbance")
RANGES = {"temperature": (-40.0, 125.0), "humidity": (0.0, 100.0), "gas_concentration": (0.0, 1000.0)}


class ResearchService:
    @staticmethod
    def record(db: Session, environment: str, record_type: str, node_id: str, payload: dict[str, Any], measurement_id: int | None = None, related_record_id: int | None = None) -> ResearchRecord:
        row = ResearchRecord(environment=environment, record_type=record_type, node_id=node_id, payload=json.dumps(payload, sort_keys=True), measurement_id=measurement_id, related_record_id=related_record_id)
        db.add(row)
        db.flush()
        return row

    @staticmethod
    def analyze_measurement(db: Session, measurement: Measurement) -> list[ResearchRecord]:
        node = db.get(SensorNode, measurement.node_id)
        if not node:
            return []
        recent = list(db.scalars(select(Measurement).where(
            Measurement.node_id == measurement.node_id,
            Measurement.environment == measurement.environment,
            Measurement.measurement_type == measurement.measurement_type,
            Measurement.id != measurement.id,
        ).order_by(Measurement.measured_at.desc()).limit(12)).all())
        values = [float(row.value) for row in reversed(recent)]
        value = float(measurement.value)
        reasons: list[str] = []
        bounds = RANGES.get(measurement.measurement_type)
        source_sensor = db.get(Sensor, measurement.sensor_id) if measurement.sensor_id else None
        source_profile = db.get(SensorProfile, source_sensor.profile_id) if source_sensor else None
        if source_profile and source_profile.default_minimum is not None and source_profile.default_maximum is not None:
            bounds = (float(source_profile.default_minimum), float(source_profile.default_maximum))
        if bounds and not bounds[0] <= value <= bounds[1]:
            reasons.append("out_of_range")
        if len(values) >= 3:
            baseline = statistics.median(values[-7:])
            deviations = [abs(v - statistics.median(values[-7:])) for v in values[-7:]]
            mad = statistics.median(deviations) if deviations else 0
            threshold = max(settings.ANOMALY_TEMPERATURE_STEP_DELTA if measurement.measurement_type == "temperature" else settings.ANOMALY_OTHER_STEP_DELTA, mad * 6)
            if value - baseline > threshold:
                reasons.append("sudden_spike")
            elif baseline - value > threshold:
                reasons.append("sudden_drop")
            if len(values) >= 4 and len(set(values[-4:] + [value])) == 1:
                reasons.append("stuck_reading")
            if len(values) >= 5 and all(a <= b for a, b in zip(values[-5:], values[-4:])) and value > values[-1] and value - values[-5] > threshold * 0.5:
                reasons.append("gradual_drift")
            if len(values) >= 5 and statistics.pstdev(values[-5:] + [value]) > threshold:
                reasons.append("irregular_fluctuation")
        if recent:
            current_at = measurement.measured_at if measurement.measured_at.tzinfo else measurement.measured_at.replace(tzinfo=timezone.utc)
            previous_at = recent[0].measured_at if recent[0].measured_at.tzinfo else recent[0].measured_at.replace(tzinfo=timezone.utc)
            if (current_at - previous_at).total_seconds() > settings.ANOMALY_GAP_SECONDS:
                reasons.append("measurement_gap")
        related_observations = ResearchService._related_observations(db, measurement)
        if any(reason in reasons for reason in ("sudden_spike", "sudden_drop")) and related_observations and not any(item["changed"] for item in related_observations):
            reasons.append("cross_sensor_inconsistency")
        if not reasons:
            ResearchService.record(db, measurement.environment, "trusted_measurement", node.node_id, {
                "raw_value": value, "recovered_value": None, "measurement_type": measurement.measurement_type,
                "measured_at": measurement.measured_at.isoformat(), "validation_decision": "accepted",
                "sensor_id": measurement.sensor_id, "source_type": measurement.source_type,
                "anomaly_reference": None, "selected_hypothesis": "nominal",
                "confidence": 1.0, "supporting_evidence": ["within configured range", "within temporal checks"],
                "provenance": [f"raw measurement {measurement.id}", "within configured range and temporal checks"],
            }, measurement.id)
            return []

        evidence = {
            "reasons": sorted(set(reasons)), "raw_value": value,
            "history_count": len(values), "recent_values": values[-7:],
            "baseline_median": statistics.median(values[-7:]) if values else None,
            "range": bounds, "communication_quality": "packet_received",
            "related_sensor_observations": related_observations,
        }
        scores = ResearchService._hypothesis_scores(reasons, evidence["related_sensor_observations"])
        anomaly = ResearchService.record(db, measurement.environment, "anomaly", node.node_id, {
            "anomaly_types": sorted(set(reasons)), "severity": "critical" if "out_of_range" in reasons else "high" if any(x in reasons for x in ("sudden_spike", "sudden_drop", "measurement_gap")) else "medium",
            "confidence": round(max(scores.values()), 4), "evidence": evidence,
        }, measurement.id)
        ResearchService.record(db, measurement.environment, "hypothesis_analysis", node.node_id, {
            "hypotheses": [{"type": key, "confidence": round(scores[key], 4), "supporting": ResearchService._supports(key, reasons, evidence), "contradicting": ResearchService._contradicts(key, reasons, evidence)} for key in HYPOTHESES],
            "selected": max(scores, key=scores.get), "anomaly_record_id": anomaly.id,
        }, measurement.id, anomaly.id)
        ResearchService.record(db, measurement.environment, "evidence", node.node_id, evidence, measurement.id, anomaly.id)
        fingerprint = {
            "measurement_type": measurement.measurement_type,
            "absolute_change": abs(value - evidence["baseline_median"]) if evidence["baseline_median"] is not None else None,
            "direction": "up" if evidence["baseline_median"] is not None and value > evidence["baseline_median"] else "down",
            "step_response": True, "cross_sensor_corroboration_count": sum(1 for item in evidence["related_sensor_observations"] if item["changed"]),
        }
        ResearchService.record(db, measurement.environment, "response_fingerprint", node.node_id, fingerprint, measurement.id, anomaly.id)
        ranked = sorted(scores.values(), reverse=True)
        open_investigations = db.scalars(select(ResearchRecord).where(
            ResearchRecord.environment == measurement.environment,
            ResearchRecord.node_id == node.node_id,
            ResearchRecord.record_type == "investigation",
        ).order_by(ResearchRecord.id.desc()).limit(20)).all()
        latest_investigations: dict[int, ResearchRecord] = {}
        for previous in open_investigations:
            key = previous.related_record_id or previous.id
            latest_investigations.setdefault(key, previous)
        for previous in latest_investigations.values():
            previous_payload = json.loads(previous.payload)
            if previous_payload.get("status") != "active" or previous.measurement_id == measurement.id:
                continue
            new_status = "resolved" if ranked[0] - ranked[1] >= 0.2 else "active"
            ResearchService.record(db, measurement.environment, "investigation", node.node_id, {
                "status": new_status, "update_of": previous.id,
                "reason": "Updated after a later synchronized sensor observation",
                "observation_measurement_id": measurement.id,
                "confidence_before": previous_payload.get("confidence_after", previous_payload.get("confidence_before")),
                "confidence_after": scores,
                "result": "Competing explanation became clearer" if new_status == "resolved" else "More observations are still needed",
            }, measurement.id, previous.related_record_id)
        if len(ranked) > 1 and ranked[0] - ranked[1] < 0.16:
            ResearchService.record(db, measurement.environment, "investigation", node.node_id, {
                "status": "active", "reason": "Competing explanations remain close",
                "diagnostic_observations": ["Compare synchronized humidity and gas response", "Check packet timing and recent delivery gaps", "Compare the next three readings against the baseline"],
                "confidence_before": scores, "anomaly_record_id": anomaly.id,
            }, measurement.id, anomaly.id)
        if "out_of_range" in reasons or "sudden_spike" in reasons or "sudden_drop" in reasons or "stuck_reading" in reasons:
            temporal_candidate = statistics.median(values[-7:]) if values else None
            related_values = ResearchService._related_predictions(db, measurement, node, source_sensor, source_profile)
            related_candidate = statistics.median(related_values) if related_values else None
            strategy = "temporal_median"
            candidate = temporal_candidate
            support_count = len(values)
            method = "median of up to seven prior same-sensor readings"
            if temporal_candidate is not None and related_candidate is not None and abs(temporal_candidate - related_candidate) <= max(settings.ANOMALY_OTHER_STEP_DELTA, abs(temporal_candidate) * 0.25):
                candidate = statistics.median([temporal_candidate, related_candidate])
                strategy = "spatiotemporal_median"
                support_count += len(related_values)
                method = "combined median of temporal history and explicitly co-located same-type sensors"
            elif temporal_candidate is None and related_candidate is not None:
                candidate = related_candidate
                strategy = "related_sensor_median"
                support_count = len(related_values)
                method = "median from same-type sensors with identical configured location and unit"
            if candidate is None:
                return [anomaly]
            dispersion_values = values[-7:] + related_values
            dispersion = statistics.median([abs(v - candidate) for v in dispersion_values]) if dispersion_values else 0.0
            confidence = max(0.0, min(1.0, 1.0 - dispersion / max(abs(candidate), 1.0)))
            candidate_row = ResearchService.record(db, measurement.environment, "recovery_candidate", node.node_id, {
                "raw_value": value, "proposed_value": candidate, "sensor_id": measurement.sensor_id, "strategy": strategy,
                "supporting_measurements": support_count, "method": method, "related_sensor_values": related_values,
                "uncertainty": dispersion, "confidence": round(confidence, 4),
            }, measurement.id, anomaly.id)
            valid = bounds is None or bounds[0] <= candidate <= bounds[1]
            enough_support = len(values) >= 4 if strategy == "temporal_median" else support_count >= 2
            rapid_trend = len(values) >= 2 and abs(values[-1] - values[-2]) > settings.ANOMALY_TEMPERATURE_STEP_DELTA
            corroborated_event = any(item["changed"] for item in evidence["related_sensor_observations"])
            decision = "accepted" if enough_support and valid and confidence >= 0.75 and not rapid_trend and not corroborated_event else "rejected" if not valid or rapid_trend or corroborated_event else "needs_further_investigation"
            validation = ResearchService.record(db, measurement.environment, "recovery_validation", node.node_id, {
                "decision": decision, "physical_plausibility": valid, "historical_consistency": len(values) >= 4,
                "cross_sensor_consistency": len(related_values) >= 2,
                "temporal_consistency": not rapid_trend,
                "corroborated_event": corroborated_event,
                "uncertainty": dispersion, "confidence": round(confidence, 4),
                "independent_checks": ["configured physical range", "history sample count", "median absolute deviation"],
            }, measurement.id, candidate_row.id)
            if decision == "accepted":
                ResearchService.record(db, measurement.environment, "trusted_measurement", node.node_id, {
                    "raw_value": value, "recovered_value": candidate, "measurement_type": measurement.measurement_type,
                    "measured_at": measurement.measured_at.isoformat(), "validation_decision": decision,
                    "environment": measurement.environment, "sensor_id": measurement.sensor_id,
                    "anomaly_reference": anomaly.id, "selected_hypothesis": max(scores, key=scores.get),
                    "supporting_evidence": evidence,
                    "recovery_method": strategy, "confidence": round(confidence, 4),
                    "provenance": [f"raw measurement {measurement.id}", f"anomaly {anomaly.id}", f"recovery candidate {candidate_row.id}", f"validation {validation.id}"],
                }, measurement.id, validation.id)
        return [anomaly]

    @staticmethod
    def _related_observations(db: Session, measurement: Measurement) -> list[dict[str, Any]]:
        rows = db.scalars(select(Measurement).where(
            Measurement.node_id == measurement.node_id, Measurement.environment == measurement.environment,
            Measurement.measurement_type != measurement.measurement_type,
        ).order_by(Measurement.measured_at.desc()).limit(24)).all()
        latest: dict[str, Measurement] = {}
        for row in rows: latest.setdefault(row.measurement_type, row)
        observations = []
        for kind, row in latest.items():
            previous = db.scalar(select(Measurement).where(
                Measurement.node_id == measurement.node_id, Measurement.environment == measurement.environment,
                Measurement.measurement_type == kind, Measurement.measured_at < row.measured_at,
            ).order_by(Measurement.measured_at.desc()).limit(1))
            threshold = settings.ANOMALY_OTHER_STEP_DELTA
            changed = bool(previous and abs(float(row.value) - float(previous.value)) > threshold)
            observations.append({"type": kind, "value": float(row.value), "baseline": float(previous.value) if previous else None, "changed": changed, "measured_at": row.measured_at.isoformat()})
        return observations

    @staticmethod
    def _related_predictions(db: Session, measurement: Measurement, node: SensorNode, source_sensor: Sensor | None, source_profile: SensorProfile | None) -> list[float]:
        """Only use cross-node values with explicitly identical location, type, and engineering unit."""
        if not source_sensor or not source_profile or not source_sensor.location_description:
            return []
        candidates = db.execute(select(Sensor, SensorNode).join(SensorNode, Sensor.node_id == SensorNode.id).join(
            SensorProfile, Sensor.profile_id == SensorProfile.id,
        ).where(
            Sensor.node_id != node.id, SensorNode.environment == measurement.environment, Sensor.is_active.is_(True),
            Sensor.location_description == source_sensor.location_description,
            SensorProfile.measurement_type == source_profile.measurement_type,
            SensorProfile.unit == source_profile.unit,
        )).all()
        values: list[float] = []
        for related_sensor, _related_node in candidates:
            reading = db.scalar(select(Measurement).where(
                Measurement.sensor_id == related_sensor.id, Measurement.environment == measurement.environment,
                Measurement.measurement_type == measurement.measurement_type,
            ).order_by(Measurement.measured_at.desc()).limit(1))
            if reading:
                values.append(float(reading.value))
        return values

    @staticmethod
    def _hypothesis_scores(reasons: list[str], related: list[dict[str, Any]]) -> dict[str, float]:
        sensor, physical, communication, environmental = 0.18, 0.18, 0.10, 0.12
        if any(r in reasons for r in ("out_of_range", "stuck_reading", "gradual_drift")): sensor += 0.48
        if "cross_sensor_inconsistency" in reasons: sensor += 0.3
        if any(r in reasons for r in ("sudden_spike", "sudden_drop")): sensor += 0.28; physical += 0.18; environmental += 0.12
        if any(reason in reasons for reason in ("measurement_gap", "missing_telemetry", "communication_interruption")): communication += 0.5
        if related and any(item["changed"] for item in related) and any(r in reasons for r in ("sudden_spike", "sudden_drop")): physical += 0.14; environmental += 0.18
        vals = {"sensor_fault": sensor, "physical_event": physical, "communication_fault": communication, "environmental_disturbance": environmental}
        total = sum(vals.values())
        return {key: value / total for key, value in vals.items()}

    @staticmethod
    def _supports(hypothesis: str, reasons: list[str], evidence: dict[str, Any]) -> list[str]:
        by_reason = {"sensor_fault": ["out_of_range", "stuck_reading", "gradual_drift", "sudden_spike", "sudden_drop", "cross_sensor_inconsistency"], "physical_event": ["sudden_spike", "sudden_drop"], "communication_fault": ["measurement_gap"], "environmental_disturbance": ["sudden_spike", "sudden_drop"]}
        support = [reason.replace("_", " ") for reason in reasons if reason in by_reason[hypothesis]]
        if any(item["changed"] for item in evidence["related_sensor_observations"]) and hypothesis in {"physical_event", "environmental_disturbance"}: support.append("related sensor changed in the same node")
        return support

    @staticmethod
    def _contradicts(hypothesis: str, reasons: list[str], evidence: dict[str, Any]) -> list[str]:
        if hypothesis == "communication_fault" and evidence["communication_quality"] == "packet_received": return ["measurement packet arrived and parsed"]
        if hypothesis == "physical_event" and "out_of_range" in reasons: return ["value exceeds configured physical range"]
        if hypothesis == "environmental_disturbance" and not any(item["changed"] for item in evidence["related_sensor_observations"]): return ["no related sensor corroboration available"]
        if hypothesis == "sensor_fault" and any(item["changed"] for item in evidence["related_sensor_observations"]): return ["other sensor channels provide corroborating context"]
        return []

    @staticmethod
    def record_scenario_event(db: Session, node_id: str, event_type: str, detail: str) -> list[ResearchRecord]:
        if event_type not in {"missing_telemetry", "communication_interruption"}:
            raise ValueError("Unsupported scenario event")
        reasons = [event_type]
        scores = ResearchService._hypothesis_scores(reasons, [])
        anomaly = ResearchService.record(db, "demo", "anomaly", node_id, {"anomaly_types": reasons, "severity": "high", "confidence": max(scores.values()), "evidence": {"description": detail, "communication_quality": "missing"}}, None)
        ResearchService.record(db, "demo", "hypothesis_analysis", node_id, {"hypotheses": [{"type": key, "confidence": scores[key], "supporting": ResearchService._supports(key, reasons, {"related_sensor_observations": []}), "contradicting": []} for key in HYPOTHESES], "selected": max(scores, key=scores.get), "anomaly_record_id": anomaly.id}, None, anomaly.id)
        ResearchService.record(db, "demo", "evidence", node_id, {"event": event_type, "description": detail, "packet_received": False}, None, anomaly.id)
        return [anomaly]

    @staticmethod
    def record_communication_event(db: Session, node_id: str, environment: str, detail: str) -> ResearchRecord:
        scores = ResearchService._hypothesis_scores(["measurement_gap"], [])
        anomaly = ResearchService.record(db, environment, "anomaly", node_id, {
            "anomaly_types": ["communication_interruption"], "severity": "high",
            "confidence": round(scores["communication_fault"], 4),
            "evidence": {"description": detail, "communication_quality": "offline status received"},
        })
        ResearchService.record(db, environment, "hypothesis_analysis", node_id, {
            "hypotheses": [{"type": key, "confidence": round(scores[key], 4), "supporting": ["node reported offline" ] if key == "communication_fault" else [], "contradicting": []} for key in HYPOTHESES],
            "selected": "communication_fault", "anomaly_record_id": anomaly.id,
        }, related_record_id=anomaly.id)
        ResearchService.record(db, environment, "evidence", node_id, {"event": "communication_interruption", "description": detail, "packet_received": False}, related_record_id=anomaly.id)
        ResearchService.record(db, environment, "response_fingerprint", node_id, {"communication_transition": "online_to_offline", "packet_received": False}, related_record_id=anomaly.id)
        return anomaly

    @staticmethod
    def handle_missing_measurement(db: Session, node_id: str, expected_scenario: str) -> dict[str, Any]:
        node = db.scalar(select(SensorNode).where(SensorNode.node_id == node_id, SensorNode.environment == "demo"))
        if not node:
            raise ValueError("Demo node not found")
        rows = list(db.scalars(select(Measurement).where(
            Measurement.node_id == node.id, Measurement.environment == "demo", Measurement.measurement_type == "temperature",
        ).order_by(Measurement.measured_at.desc()).limit(7)).all())
        values = [float(row.value) for row in reversed(rows)]
        estimate = statistics.median(values) if values else None
        dispersion = statistics.median([abs(v - estimate) for v in values]) if values and estimate is not None else None
        confidence = max(0.0, min(1.0, 1 - dispersion / max(abs(estimate), 1))) if dispersion is not None and estimate is not None else 0.0
        rapid_change = len(values) >= 2 and abs(values[-1] - values[-2]) > 12
        bounds = RANGES["temperature"]
        plausible = estimate is not None and bounds[0] <= estimate <= bounds[1]
        decision = "accepted" if len(values) >= 4 and plausible and confidence >= 0.75 and not rapid_change else "rejected" if not plausible or rapid_change else "needs_further_investigation"
        # The accepted/rejected cases are repeatable ground-truth tests; evaluation remains based on this independent method result.
        candidate = ResearchService.record(db, "demo", "recovery_candidate", node_id, {
            "raw_value": None, "proposed_value": estimate, "strategy": "temporal_median",
            "supporting_measurements": len(values), "method": "median of up to seven prior temperature readings",
            "uncertainty": dispersion, "confidence": round(confidence, 4), "missing_sample": True,
        })
        validation = ResearchService.record(db, "demo", "recovery_validation", node_id, {
            "decision": decision, "physical_plausibility": plausible, "historical_consistency": len(values) >= 4,
            "cross_sensor_consistency": False, "uncertainty": dispersion, "confidence": round(confidence, 4),
            "independent_checks": ["configured temperature range", "history sample count", "median absolute deviation", "recent rate of change"],
            "ground_truth_scenario": expected_scenario,
        }, related_record_id=candidate.id)
        if decision == "accepted":
            ResearchService.record(db, "demo", "trusted_measurement", node_id, {
                "raw_value": None, "recovered_value": estimate, "measurement_type": "temperature",
                "validation_decision": decision, "confidence": round(confidence, 4),
                "provenance": [f"recovery candidate {candidate.id}", f"independent validation {validation.id}"],
            }, related_record_id=validation.id)
        return {"candidate": candidate, "validation": validation}

    @staticmethod
    def list_records(db: Session, environment: str, record_type: str | None = None, node_id: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        query = select(ResearchRecord).where(ResearchRecord.environment == environment)
        if record_type: query = query.where(ResearchRecord.record_type == record_type)
        if node_id: query = query.where(ResearchRecord.node_id == node_id)
        rows = db.scalars(query.order_by(ResearchRecord.created_at.desc()).limit(min(max(limit, 1), 500))).all()
        return [{"id": row.id, "environment": row.environment, "record_type": row.record_type, "node_id": row.node_id, "measurement_id": row.measurement_id, "related_record_id": row.related_record_id, "payload": json.loads(row.payload), "created_at": row.created_at} for row in rows]

    @staticmethod
    def summary(db: Session, environment: str) -> dict[str, Any]:
        def count(record_type: str) -> int:
            return db.scalar(select(func.count(ResearchRecord.id)).where(ResearchRecord.environment == environment, ResearchRecord.record_type == record_type)) or 0
        total = db.scalar(select(func.count(Measurement.id)).where(Measurement.environment == environment)) or 0
        trusted = count("trusted_measurement")
        recovery_results: dict[str, int] = {"accepted": 0, "rejected": 0, "needs_further_investigation": 0}
        for row in db.scalars(select(ResearchRecord).where(ResearchRecord.environment == environment, ResearchRecord.record_type == "recovery_validation")).all():
            decision = json.loads(row.payload).get("decision")
            if decision in recovery_results: recovery_results[decision] += 1
        evaluation = None
        if environment == "demo":
            runs = db.scalars(select(ScenarioRun).where(ScenarioRun.environment == "demo", ScenarioRun.status == "completed")).all()
            if runs:
                tp = fp = fn = tn = hypothesis_hits = hypothesis_total = 0
                recovery_correct = recovery_total = 0
                diagnostic_confidences: list[float] = []
                recovery_errors: list[float] = []
                rejected_run_candidates = false_admissions = scenario_measurements = expected_measurements = 0
                for run in runs:
                    anomaly_rows = db.scalars(select(ResearchRecord).where(ResearchRecord.environment == "demo", ResearchRecord.node_id == run.node_id, ResearchRecord.record_type == "anomaly")).all()
                    truth_positive = run.scenario_id != "normal"
                    predicted = bool(anomaly_rows)
                    if truth_positive and predicted: tp += 1
                    elif truth_positive: fn += 1
                    elif predicted: fp += 1
                    else: tn += 1
                    expected_key = max(json.loads(run.ground_truth)["hypotheses"], key=json.loads(run.ground_truth)["hypotheses"].get)
                    hypotheses = db.scalars(select(ResearchRecord).where(ResearchRecord.environment == "demo", ResearchRecord.node_id == run.node_id, ResearchRecord.record_type == "hypothesis_analysis").order_by(ResearchRecord.id)).all()
                    if hypotheses:
                        hypothesis_total += 1
                        latest_hypothesis = json.loads(hypotheses[-1].payload)
                        if latest_hypothesis.get("selected") == expected_key: hypothesis_hits += 1
                        confidences = [float(item.get("confidence", 0)) for item in latest_hypothesis.get("hypotheses", [])]
                        if confidences: diagnostic_confidences.append(max(confidences))
                    scenario_measurements += db.scalar(select(func.count(Measurement.id)).where(Measurement.environment == "demo", Measurement.node_id == select(SensorNode.id).where(SensorNode.node_id == run.node_id).scalar_subquery())) or 0
                    expected_measurements += 12 * 3
                    if run.scenario_id in {"recovery_accepted", "recovery_rejected"}:
                        checks = db.scalars(select(ResearchRecord).where(ResearchRecord.environment == "demo", ResearchRecord.node_id == run.node_id, ResearchRecord.record_type == "recovery_validation").order_by(ResearchRecord.id)).all()
                        if checks:
                            recovery_total += 1
                            expected = "accepted" if run.scenario_id == "recovery_accepted" else "rejected"
                            if json.loads(checks[-1].payload).get("decision") == expected: recovery_correct += 1
                        candidates = db.scalars(select(ResearchRecord).where(ResearchRecord.environment == "demo", ResearchRecord.node_id == run.node_id, ResearchRecord.record_type == "recovery_candidate").order_by(ResearchRecord.id)).all()
                        if run.scenario_id == "recovery_rejected":
                            for candidate in candidates:
                                rejected_run_candidates += 1
                                validation = db.scalar(select(ResearchRecord).where(ResearchRecord.environment == "demo", ResearchRecord.related_record_id == candidate.id, ResearchRecord.record_type == "recovery_validation"))
                                if validation and json.loads(validation.payload).get("decision") == "accepted": false_admissions += 1
                        if run.scenario_id == "recovery_accepted":
                            expected_value = json.loads(run.ground_truth).get("expected_recovery_value")
                            missing_candidates = [candidate for candidate in candidates if json.loads(candidate.payload).get("raw_value") is None]
                            if expected_value is not None and missing_candidates:
                                recovery_errors.append(abs(float(json.loads(missing_candidates[-1].payload)["proposed_value"]) - float(expected_value)))
                evaluation = {
                    "labelled_completed_scenarios": len(runs),
                    "anomaly_precision": tp / (tp + fp) if tp + fp else None,
                    "anomaly_recall": tp / (tp + fn) if tp + fn else None,
                    "false_positive_rate": fp / (fp + tn) if fp + tn else None,
                    "hypothesis_accuracy": hypothesis_hits / hypothesis_total if hypothesis_total else None,
                    "diagnostic_confidence": sum(diagnostic_confidences) / len(diagnostic_confidences) if diagnostic_confidences else None,
                    "recovery_prediction_error": sum(recovery_errors) / len(recovery_errors) if recovery_errors else None,
                    "recovery_validation_accuracy": recovery_correct / recovery_total if recovery_total else None,
                    "false_recovery_rate": false_admissions / rejected_run_candidates if rejected_run_candidates else None,
                    "data_availability": scenario_measurements / expected_measurements if expected_measurements else None,
                    "evaluated_hypotheses": hypothesis_total,
                    "evaluated_recovery_decisions": recovery_total,
                    "evaluated_recovery_predictions": len(recovery_errors),
                    "label_source": "completed demonstration scenario ground truth",
                }
        investigation_rows = db.scalars(select(ResearchRecord).where(ResearchRecord.environment == environment, ResearchRecord.record_type == "investigation").order_by(ResearchRecord.id.desc())).all()
        latest_investigations: dict[tuple[str, int | None], ResearchRecord] = {}
        for row in investigation_rows:
            latest_investigations.setdefault((row.node_id, row.related_record_id), row)
        active_investigation_count = sum(1 for row in latest_investigations.values() if json.loads(row.payload).get("status") == "active")
        return {
            "environment": environment, "measurements": total, "anomalies": count("anomaly"),
            "hypothesis_analyses": count("hypothesis_analysis"), "evidence_records": count("evidence"),
            "active_investigations": active_investigation_count,
            "response_fingerprints": count("response_fingerprint"), "recovery_candidates": count("recovery_candidate"),
            "recovery_validation": recovery_results, "trusted_measurements": trusted,
            "trusted_measurement_coverage": trusted / total if total else None,
            "evaluation": evaluation,
        }
