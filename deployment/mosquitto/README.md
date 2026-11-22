# Mosquitto Broker Configuration for VeyraSense

## Overview
VeyraSense utilizes Eclipse Mosquitto on the Raspberry Pi 5 as the primary industrial edge MQTT broker.

### Security Architecture
- **No Anonymous Access:** `allow_anonymous false`.
- **Per-Node Credentials:** Authentication file `/var/lib/veyrasense/mosquitto/mosquitto_passwd` stores individual node username/password hashes.
- **Strict Per-Node ACLs:** Authorization file `/var/lib/veyrasense/mosquitto/mosquitto.acl` restricts every sensor node strictly to its own topic hierarchy:
  - `veyrasense/nodes/{node_id}/telemetry` (Write only)
  - `veyrasense/nodes/{node_id}/status` (Read/Write)
  - `veyrasense/nodes/{node_id}/commands` (Read only)
- **Automatic Sync:** The VeyraSense backend dynamically updates `mosquitto_passwd` and `mosquitto.acl` whenever nodes are provisioned, rotated, or revoked.

### Installation on Raspberry Pi 5 (Debian 13)
```bash
sudo apt update
sudo apt install -y mosquitto mosquitto-clients
sudo cp deployment/mosquitto/mosquitto.conf /etc/mosquitto/conf.d/veyrasense.conf
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```
