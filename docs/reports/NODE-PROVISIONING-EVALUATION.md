# VeyraSense — Dynamic Sensor Node Provisioning Evaluation Report

**Document Reference:** `docs/reports/NODE-PROVISIONING-EVALUATION.md`  
**Execution Date:** November 22, 2026  
**Auditor & Architect:** Senior IoT Systems Architect & Application Security Engineer  
**Status:** **VERIFIED & OPERATIONAL** (39/39 Backend Tests Passing, 0 Frontend TypeScript Build Errors)

---

## 1. Executive Summary

Dynamic sensor node provisioning and secure MQTT topic access control have been successfully designed, implemented, and verified for the VeyraSense industrial IoT platform. 

The system enables an administrator to register physical or simulated edge nodes directly from the VeyraSense dashboard, generate high-entropy cryptographic credentials, configure identical ESP32 firmware via a clean `config.h` header snippet, and enforce strict per-node isolation at both the Mosquitto broker (ACL) and backend application layers.

### Key Deliverables Implemented
1. **Interactive Dashboard Provisioning Console (`DevicesPage.tsx`):**
   - Built a dynamic "Register & Provision Node" modal supporting candidate node ID generation, department assignment, physical location descriptions, and transducer selection (DHT11 and MQ-135).
   - Engineered a high-visibility **One-Time Secret Credential Modal** featuring one-click copy controls, explicit warning banners, and ready-to-flash C++ `config.h` header snippets.
   - Displayed live fleet status with clear provisioning indicators: `Pending`, `Connected`, `Offline`, and `Revoked`.
   - Provided in-dashboard actions for **Credential Rotation**, **Node Revocation**, and **Security Audit Trail** inspection.
2. **Backend Device Identity & Security Architecture:**
   - Generated cryptographically secure pre-shared device secrets (`secrets.token_urlsafe(32)`) and dedicated MQTT passwords.
   - Enforced irreversible hashing: only SHA-256 digests (`api_key_hash`, `mqtt_password_hash`) are stored in SQLite; raw secrets are never persisted in plaintext.
   - Created an immutable audit log (`audit_logs` table) tracking registration, activation, revocation, credential rotation, and spoofing attempts.
   - Implemented soft revocation: revoking a node terminates MQTT ACL and HTTP API access immediately while strictly preserving 100% of historical measurement records.
3. **Mosquitto MQTT Integration & Topic Isolation:**
   - Automated generation of `mosquitto.conf`, `mosquitto_passwd`, and `mosquitto.acl`.
   - Restricts each node strictly to its own dedicated topics:
     - Publish: `veyrasense/nodes/{node_id}/telemetry`
     - Publish/Subscribe: `veyrasense/nodes/{node_id}/status`
     - Subscribe: `veyrasense/nodes/{node_id}/commands`
   - Built an internal MQTT telemetry ingestion processor (`MQTTIngestionService`) that validates payload `node_id` against topic `node_id` to block cross-node spoofing, handles Last Will and Testament (LWT) disconnects, and deduplicates retransmitted packets.
4. **Reusable ESP32 Firmware Suite (`firmware/esp32/`):**
   - Engineered clean C++ firmware (`firmware/esp32/src/main.cpp`) with exponential backoff Wi-Fi management, PubSubClient MQTT with LWT, Adafruit DHT11 drivers, MQ-135 12-bit ADC oversampling, and monotonic sequence counters.
   - Provided isolated configuration template (`include/config.h.example`) and enforced git exclusion (`.gitignore` excludes `firmware/**/config.h`).
5. **Comprehensive Test Suite (`backend/tests/test_node_provisioning.py`):**
   - Added 7 dedicated validation tests verifying multi-node concurrency, identity isolation, duplicate rejection, revocation enforcement, reconnection handling, and historical data preservation.

---

## 2. Architecture & Security Implementation

### 2.1 Credential & Authentication Separation
HTTP `X-Device-Key` authentication and MQTT broker authentication are decoupled:
- **HTTP Transport (`X-Device-Key`):** Used for direct edge gateway REST ingestion (`POST /api/v1/measurements`). Validated against `sensor_nodes.api_key_hash`.
- **MQTT Transport (Mosquitto Port 1883):** Authenticated using node-specific username (`node_id`) and password hash in `mosquitto_passwd`. Topic read/write permissions are restricted per-node in `mosquitto.acl`.

```
+---------------------------------------------------------------------------------------+
|                                    MOSQUITTO BROKER                                   |
|                                                                                       |
|   NODE-PRD-01 (ESP32)  --> [ACL check] --> veyrasense/nodes/NODE-PRD-01/telemetry     |
|   NODE-PRD-02 (ESP32)  --> [ACL check] --> veyrasense/nodes/NODE-PRD-02/telemetry     |
|                                                                                       |
|   Cross-node publishing:                                                              |
|   NODE-PRD-01 attempting publish to NODE-PRD-02 topic  --> [DENIED BY MOSQUITTO ACL]  |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v (Subscribed as veyrasense_backend)
+---------------------------------------------------------------------------------------+
|                              VEYRASENSE INGESTION WORKER                              |
|                                                                                       |
|   1. Topic-to-Payload Identity Match Check (topic_node_id == payload.node_id)       |
|   2. Provisioning & Active State Check (is_active == True, status != "revoked")       |
|   3. Sequence Deduplication (Drops retransmission duplicates idempotently)           |
|   4. Atomic SQLite Measurement Ingestion & Last Seen Heartbeat Update                 |
+---------------------------------------------------------------------------------------+
```

### 2.2 Database Schema Enhancements (Alembic Migration `e91a0c44b3f1`)
- **`sensor_nodes` Table:**
  - `location` (`String(255)`): Physical industrial installation site.
  - `provisioning_status` (`String(32)`): Indexed status (`pending`, `connected`, `offline`, `revoked`).
  - `mqtt_username` (`String(64)`): Unique broker username.
  - `mqtt_password_hash` (`String(128)`): Cryptographic hash of MQTT credentials.
  - `credentials_rotated_at` (`DateTime`): Timestamp of latest key rotation.
  - `revoked_at` (`DateTime`): Timestamp of node revocation.
- **`audit_logs` Table:**
  - `id` (`Integer`, PK): Auto-incremented identifier.
  - `timestamp` (`DateTime`): UTC timestamp.
  - `action` (`String(64)`): Event type (`node_registered`, `node_activated`, `node_revoked`, `credentials_rotated`, `spoofing_attempt_rejected`).
  - `entity_type` (`String(64)`): Target entity type (`node`).
  - `entity_id` (`String(64)`): Node identifier.
  - `actor` (`String(128)`): Initiator (e.g. administrator email or broker).
  - `details` (`String(1024)`): JSON metadata describing changes.

---

## 3. Mosquitto Broker Configuration & ACL Sample

When a node is provisioned or revoked, `MosquittoProvisioningService.sync_mosquitto_configuration` regenerates `mosquitto.acl`:

```text
# Backend Ingestion & Supervision Service (Internal)
user veyrasense_backend
topic read veyrasense/nodes/+/telemetry
topic readwrite veyrasense/nodes/+/status
topic write veyrasense/nodes/+/commands

# --- Node: NODE-PRD-01 (Chiller Room Monitor) ---
user NODE-PRD-01
topic write veyrasense/nodes/NODE-PRD-01/telemetry
topic readwrite veyrasense/nodes/NODE-PRD-01/status
topic read veyrasense/nodes/NODE-PRD-01/commands
```

When an administrator clicks **Revoke Node**, the node's block is stripped from `mosquitto.acl` and `mosquitto_passwd`, immediately closing active sockets and rejecting subsequent connection handshakes.

---

## 4. ESP32 Firmware Implementation

- **Location:** `firmware/esp32/src/main.cpp`
- **Configuration Template:** `firmware/esp32/include/config.h.example`
- **Telemetry Schema Transmitted:**
```json
{
  "node_id": "NODE-PRD-4A2F",
  "sequence_num": 142,
  "timestamp": "2026-11-22T18:30:00Z",
  "sensors": {
    "temperature": 24.50,
    "humidity": 55.20,
    "air_quality_raw": 412
  },
  "diagnostics": {
    "wifi_rssi": -64,
    "free_heap": 184320,
    "uptime_sec": 710
  }
}
```

---

## 5. Automated Validation & Verification Matrix

All tests were executed against the test SQLite database and mock transports:

| Test ID | Test Name | Objective / Scenario | Result |
|---|---|---|---|
| **TEST-PROV-01** | `test_node_provisioning_workflow` | Verifies dynamic node registration, one-time secret generation, secure hashing in DB, sensor creation, and Mosquitto ACL generation. | **PASSED** |
| **TEST-PROV-02** | `test_two_nodes_provisioned_simultaneously` | Verifies two nodes provisioned concurrently receive distinct credentials and can ingest telemetry simultaneously on separate topics. | **PASSED** |
| **TEST-PROV-03** | `test_unauthorized_and_cross_node_publishing_rejected` | Verifies that Node A posting under Node B's identity is strictly rejected and recorded in the security audit log. | **PASSED** |
| **TEST-PROV-04** | `test_revoked_credentials_rejected_and_purged_from_acl` | Verifies that revoking a node invalidates MQTT and HTTP ingestion, and purges credentials from Mosquitto ACL. | **PASSED** |
| **TEST-PROV-05** | `test_reconnection_and_duplicate_telemetry_handling` | Verifies Last Will and Testament (LWT) offline handling, reconnection restoration, and sequence deduplication. | **PASSED** |
| **TEST-PROV-06** | `test_historical_measurements_preserved_after_node_deactivation` | Verifies that revoking/deactivating a node preserves 100% of historical measurement records in SQLite. | **PASSED** |
| **TEST-PROV-07** | `test_credential_rotation_and_audit` | Verifies that rotating node keys invalidates old secrets, provisions new secrets, and updates audit records. | **PASSED** |

### Test Suite Execution Output
```text
39 passed, 2 warnings in 2.48s
```
**Total Backend Tests:** 39 passed (32 security & database tests + 7 dynamic provisioning tests).

### Frontend Build Output
```text
vite v8.3.8 building client environment for production...
transforming...
✓ 2182 modules transformed.
rendering chunks...
dist/index.html                     0.72 kB │ gzip:   0.43 kB
dist/assets/index-DH5fsv9l.css     53.38 kB │ gzip:   9.79 kB
dist/assets/index-CF8P6ZYG.js   1,055.63 kB │ gzip: 273.15 kB
✓ built in 783ms
```
**Total Frontend Errors:** 0 TypeScript compile errors.

---

## 6. Constraints Adherence & Accuracy Notice

- **Hardware Notice:** ESP32 C++ firmware has been authored, verified for syntax, and structured into modular files (`firmware/esp32/`). In accordance with VeyraSense Accuracy Guidelines, physical bench testing with live silicon boards is classified as **Firmware Ready / Hardware Planned** until physical bench recording is conducted.
- **Git Safety:** No commits or pushes were made. `.gitignore` strictly protects `firmware/**/config.h`.
- **UI Preservation:** Claymorphic styling tokens, color schemes, and dashboard routing remain completely intact.
