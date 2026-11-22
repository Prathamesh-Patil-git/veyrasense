# Mosquitto Broker Configuration for VeyraSense

## Overview
VeyraSense utilizes Eclipse Mosquitto 2.0+ on the Raspberry Pi 5 as a dedicated, authenticated MQTT broker on standard port 1883 with strict per-node topic isolation.

### Broker Architecture
- **Port:** 1883 (Standard MQTT)
- **Configuration:** `/etc/mosquitto/conf.d/veyrasense.conf`
- **Password File:** `/var/lib/veyrasense/mosquitto/mosquitto_passwd`
- **Per-Node ACL File:** `/var/lib/veyrasense/mosquitto/mosquitto.acl`
- **Authentication:** Strictly enforced (`allow_anonymous false`)

### Security Architecture
- **No Anonymous Access:** `allow_anonymous false` on listener 1883.
- **PBKDF2 Password Hashing ($7$):** Passwords in `/var/lib/veyrasense/mosquitto/mosquitto_passwd` are hashed using PBKDF2-HMAC-SHA512. Plaintext passwords are strictly forbidden.
- **Strict Per-Node ACLs:** Authorization file `/var/lib/veyrasense/mosquitto/mosquitto.acl` restricts every sensor node strictly to its own topic hierarchy:
  - `veyrasense/nodes/{node_id}/telemetry` (Write only)
  - `veyrasense/nodes/{node_id}/status` (Read/Write)
  - `veyrasense/nodes/{node_id}/commands` (Read only)
- **Backend Internal Client:** Internal ingestion daemon connects to port 1883 using dedicated `veyrasense_backend` credentials.
