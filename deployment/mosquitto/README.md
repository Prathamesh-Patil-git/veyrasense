# Mosquitto Broker Configuration for VeyraSense & CARES-RX Coexistence

## Overview
VeyraSense utilizes Eclipse Mosquitto 2.0+ on the Raspberry Pi 5 configured with **per-listener isolation**, allowing it to safely coexist with existing services like CARES-RX without conflict or credentials leakage.

### Dual-Listener Architecture
1. **CARES-RX Listener (Port 1883):**
   - Retains port 1883 and its existing configuration `/etc/mosquitto/conf.d/caresrx.conf`.
   - Retains its existing password file `/etc/mosquitto/passwd`.
   - Untouched and unmanaged by VeyraSense.
2. **VeyraSense Listener (Port 1884):**
   - Dedicated listener on port 1884 configured via `/etc/mosquitto/conf.d/veyrasense.conf`.
   - Independent password file `/var/lib/veyrasense/mosquitto/mosquitto_passwd`.
   - Independent per-node ACL file `/var/lib/veyrasense/mosquitto/mosquitto.acl`.
   - Authentication strictly required (`allow_anonymous false`).
   - Uses Mosquitto's `per_listener_settings true` in `/etc/mosquitto/conf.d/00-coexistence.conf`.

### Security Architecture
- **No Anonymous Access:** `allow_anonymous false` on listener 1884.
- **PBKDF2 Password Hashing ($7$):** Passwords in `/var/lib/veyrasense/mosquitto/mosquitto_passwd` are hashed using PBKDF2-HMAC-SHA512. Plaintext passwords are strictly forbidden.
- **Strict Per-Node ACLs:** Authorization file `/var/lib/veyrasense/mosquitto/mosquitto.acl` restricts every sensor node strictly to its own topic hierarchy:
  - `veyrasense/nodes/{node_id}/telemetry` (Write only)
  - `veyrasense/nodes/{node_id}/status` (Read/Write)
  - `veyrasense/nodes/{node_id}/commands` (Read only)
- **Backend Internal Client:** Internal ingestion daemon connects to port 1884 using dedicated `veyrasense_backend` credentials.

### Installation & Migration on Raspberry Pi 5
```bash
# 1. Run safe automated coexistence migration script
sudo bash deployment/raspberry-pi/scripts/migrate-mosquitto-coexistence.sh
```
