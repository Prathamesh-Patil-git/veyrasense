# VeyraSense Research Platform

The research features extend the existing FastAPI, SQLite, Mosquitto, and React app. Real MQTT telemetry remains the physical data adapter. The demo scenario engine emits the same topic shape and canonical JSON payload, then calls `MQTTIngestionService.process_telemetry_message(..., environment="demo")` directly. Real MQTT and HTTP ingest are restricted to `real` nodes. Demo nodes have no MQTT username/password and are not provisioned into Mosquitto ACLs.

## Upgrade and start

Back up the SQLite database using the existing Raspberry Pi deployment procedure, then apply migrations from `backend/` before starting the upgraded backend:

```bash
python -m alembic upgrade head
```

The environment migration adds `real` by server default, so existing nodes and measurements remain classified as real. The scenario and research migrations add new tables only. The development seed utility tags newly created sample nodes and measurements as demo. No production data rewrite or migration run is included with this repository change.

## Environments

Sign in as an administrator and use the persistent sidebar selector. The active environment is shown above each routed view. The selector is saved in browser local storage. API node, measurement, department-count, dashboard, scenario, and research queries use an explicit `environment=real|demo`; omitted environment parameters default to real. Device provisioning, credential rotation, and destructive device actions are disabled in demo mode.

## Demo scenarios

Open **Demonstration Center** in the sidebar while Demo is selected. The catalogue includes 14 deterministic, time-ordered scenarios: normal operation, temperature spike/drop, stuck sensor, missing telemetry, communication interruption, drift, environmental disturbance, genuine physical event, sensor failure, cross-sensor inconsistency, accepted/rejected recovery, and an ambiguous investigation. Start, pause, resume, stop, reset, and replay runs; speed is 1×–10×. The page shows expected ground truth alongside recorded actual anomalies, hypotheses, recovery decisions, evidence, and trusted admissions. Run state and outputs are persisted.

The simulator advances one sample at a time and marks all generated records as demo. It does not publish to Mosquitto or actuate physical hardware. A missing sample creates a missing-telemetry event rather than an artificial measurement.

## Research pipeline

Both ingestion paths invoke the same analysis service for stored measurements:

- Temporal and profile-range checks detect out-of-range readings, spikes, drops, stuck values, drift, irregular fluctuation, long gaps, and cross-sensor inconsistency. Step thresholds and the gap window are configurable through `ANOMALY_TEMPERATURE_STEP_DELTA`, `ANOMALY_OTHER_STEP_DELTA`, and `ANOMALY_GAP_SECONDS`.
- Each anomaly gets four normalized competing hypotheses: sensor fault, physical event, communication fault, and environmental disturbance. Supporting and contradicting observations are recorded with the confidence values; related channels corroborate only when they changed beyond the configured step threshold.
- Close hypothesis scores open an observation-based investigation. Subsequent readings append investigation updates and may resolve it. The suggested diagnostics compare synchronized channels, packet timing, and future samples. No physical challenge signal is sent.
- Response fingerprints record direction, step change, and cross-channel corroboration.
- Temporal recovery uses the median of up to seven previous readings of the same type. Related-sensor recovery is eligible only for active sensors with the same configured non-empty location, same measurement type, and same engineering unit in the same environment. Spatiotemporal recovery combines those estimates only when they agree within a bounded tolerance. No arbitrary neighbors are averaged.
- A separate validator checks physical ranges, sample support, uncertainty, and available related-sensor consistency. Results are `accepted`, `rejected`, or `needs_further_investigation`. Raw measurements are never overwritten. Only accepted candidates enter trusted measurements, with the raw value, recovered value, sensor, environment, anomaly, evidence, method, validation record, confidence, and provenance chain.

Research records are environment scoped and available to administrators at `/api/v1/research/records`; the summary is at `/api/v1/research/summary`. Scenario catalogue/control APIs are under `/api/v1/scenarios`. All are protected by the existing administrator authentication.

## Evaluation limits

Research Analytics computes anomaly precision, recall, false-positive rate, hypothesis accuracy, and recovery-validation accuracy only from completed demo runs with stored scenario ground truth. Undefined metrics remain null when there are no suitable outcomes. Real-field metrics are not reported as accuracy without labelled field outcomes. Trusted measurement coverage is the current stored trusted-record count divided by measurements; it is coverage, not an accuracy score.

## Validation

Run backend tests from `backend/` with `python -m pytest tests/test_environment_isolation.py tests/test_scenarios.py tests/test_research_pipeline.py tests/test_dashboard.py tests/test_node_provisioning.py`. Build the UI from `frontend/` with `npm run build`. Tests use temporary SQLite fixtures; do not run the development seed command against production data.
