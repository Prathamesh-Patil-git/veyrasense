# VeyraSense Research Platform: Repository Audit and Milestones

## Existing implementation audit

### Implemented

- FastAPI authentication, departments, node provisioning, Mosquitto ACL generation, and revocation.
- Real MQTT telemetry/status subscriptions in `backend/app/mqtt_worker.py`.
- Topic/node identity checks, revoked-node checks, packet deduplication, and measurement persistence in `MQTTIngestionService`.
- SQLite measurement records, sensor profiles with optional physical ranges, and Alembic migrations.
- Authenticated dashboard, measurement, node, and department APIs.
- React authenticated application shell, sidebar navigation, and several backend-connected node/dashboard views.
- The confirmed dashboard `created_at` error was fixed in commit `60daefa`; nodes use `last_seen_at` with a `registered_at` fallback.

### Partially implemented

- The overview queries live backend data, but some trend/quality values are placeholders and recovery counts are inferred from a quality string.
- Monitoring and map pages load node records but display zero-valued readings rather than querying measurements.
- Device, department, and auth management are functional, but department selection still uses mock data in some pages.
- The measurement model has `quality` and `source_type`, but neither a real/demo environment nor complete analysis provenance.
- The development seed command creates synthetic sample nodes and measurements, currently without identifying them separately from real telemetry.

### Missing or currently descriptive-only

- `simulator/` has no scenario engine or scenario API.
- The sidebar has no environment selector; database queries have no environment filter.
- No anomaly detector, competing fault hypotheses, evidence records, active diagnostic investigations, or response-fingerprint analysis exist as backend services/models.
- No recovery-candidate generation, independent validation, or trusted-measurement admission pipeline exists.
- Investigations, challenges, recovery, trusted-data, ML, and analytics pages are mostly explanatory static content; they do not represent persisted research results.
- No research evaluation with scenario ground truth exists.

## Shared architecture

Use one canonical telemetry processor. MQTT remains a real-only adapter. The demo scenario engine produces canonical node/topic/payload inputs and invokes the same processor with an explicit `demo` environment. Persist environment on nodes and measurements, and require it on derived records. Default existing and newly provisioned records to `real`; migrations backfill existing rows as `real` without rewriting their measurement values. All analytics and list queries must filter by environment.

Demo-only simulated nodes have no Mosquitto credentials and therefore are not included in generated broker ACL/password files. The development seed data is classified as `demo`. Real MQTT ingestion rejects demo nodes.

## Milestone plan

| Milestone | Scope | Status |
|---|---|---|
| 1. Real ingestion stability | Fix dashboard overview failure; retain existing MQTT authentication, identity checks, deduplication, and measurement storage; add regression coverage. | Complete: timestamp fix and dashboard tests passed in commit `60daefa`. |
| 2. Environment separation | Add `real`/`demo` persistence, migration defaults, query isolation, real-only MQTT intake, development seed classification, and persistent sidebar selector. | Complete: backend isolation tests pass; UI production build passes. |
| 3. Demonstration scenarios | Reproducible scenario catalogue and persisted run controls (start, pause/resume, stop, reset/replay, speed); demo adapter feeds shared telemetry processor. | Complete: 14 scenarios, shared processor, stored controls/results, API and service tests. |
| 4. Anomaly detection | Configurable temporal/range/missing/stuck/drift/cross-sensor detectors with severity, confidence, and preserved raw readings. | Complete for implemented temporal/range/gap/channel detectors; unit behavior is covered by pipeline tests. |
| 5. Competing hypotheses and evidence | Sensor, physical event, communication, and environmental hypotheses with auditable supporting/contradicting evidence. | Complete: all four scored and stored for anomalies and communication events. |
| 6. Active diagnosis and fingerprints | Observation-based investigations and response characteristics; no unsupported physical actuation. | Complete: uncertain cases open, later observations update/resolve, and fingerprints persist. |
| 7. Recovery candidates | Temporal and justified related-sensor recovery with uncertainty and provenance; raw values remain unchanged. | Complete: temporal, exact-location/type/unit related-sensor, and bounded spatiotemporal strategies. |
| 8. Independent validation and trusted admission | Accept/reject/needs-investigation decisions; only accepted candidates enter trusted data. | Complete: range/history/uncertainty validation and explicit provenance admission. |
| 9. Dashboard and evaluation | Replace research placeholders with environment-filtered results and scenario-ground-truth metrics; distinguish simulated evaluation from measured field performance. | Complete: Overview, investigations, diagnosis, recovery, trusted-data, monitoring, explorer, and analytics pages read environment-scoped records; demo scores require completed labelled scenarios. |

Each milestone adds focused automated tests and documents actual validation. Do not label an algorithm or metric as active until it is implemented and exercised.

Implementation details, API paths, configuration, migration rollout, and evaluation limits are documented in [RESEARCH-PLATFORM.md](RESEARCH-PLATFORM.md).
