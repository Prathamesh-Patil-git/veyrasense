# VeyraSense Edge Gateway — Production Deployment Guide

**Target Hardware:** Raspberry Pi 5 (Broadcom BCM2712, 4 × Cortex-A76 @ 2.4 GHz, 4 GB LPDDR4X, 64 GB MicroSD/NVMe)  
**Target Operating System:** Debian 13 (Trixie) / Raspberry Pi OS 64-bit (ARM64)  
**Runtime Architecture:** Modular Monolith (FastAPI + SQLite WAL + Mosquitto MQTT + Nginx Reverse Proxy + React 19 Frontend)

---

## 1. Production Architecture Overview

The VeyraSense Gateway deploys as an atomic, zero-downtime, unprivileged system service on the Raspberry Pi 5.

```
                              [ Physical / Simulated ESP32 Fleet ]
                                       |              |
                    MQTT Port 1883     |              |   HTTP Port 80 (LAN)
                   (Per-Node ACL)     |              |   (X-Device-Key)
                                       v              v
+-----------------------------------------------------------------------------------------+
| RASPBERRY PI 5 GATEWAY (Debian 13 ARM64)                                                |
|                                                                                         |
|   +-----------------------+                    +------------------------------------+   |
|   |   Mosquitto Broker    |                    |           Nginx Web Server         |   |
|   | (Per-Node Topic ACLs) |                    |  - Static React 19 SPA (/assets/)  |   |
|   +-----------+-----------+                    |  - Reverse Proxy (/api/ -> :8000)   |   |
|               |                                +------------------+-----------------+   |
|               v (Internal Loopback)                               |                     |
|   +-----------------------+                                       v                     |
|   |  MQTT Ingestion Worker|                    +------------------------------------+   |
|   |  (Dedup & Validation) |                    |       FastAPI Backend (:8000)      |   |
|   +-----------+-----------+                    |   (Uvicorn 2 Workers, Unix Domain) |   |
|               |                                +------------------+-----------------+   |
|               +-----------------------+---------------------------+                     |
|                                       v                                                 |
|                        +------------------------------+                                 |
|                        |   Persistent SQLite (WAL)    |                                 |
|                        |  /var/lib/veyrasense/data/   |                                 |
|                        +------------------------------+                                 |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Directory Layout & State Persistence

All replaceable software releases are deployed under `/opt/veyrasense/releases/` with zero-downtime atomic symlinks. All database files, credentials, logs, and machine learning models reside strictly outside the release tree in persistent system directories:

| Directory Path | Purpose & Persistence Guarantees | Permissions & Owner |
|---|---|---|
| `/opt/veyrasense/current` | Active release symbolic link (`-> releases/release_<timestamp>`). | `veyrasense:veyrasense` |
| `/opt/veyrasense/releases/` | Historic releases (retains 3 most recent for instant rollback). | `veyrasense:veyrasense` |
| `/var/lib/veyrasense/data/` | Persistent SQLite database (`veyrasense.db`, `veyrasense.db-wal`). | `0750` `veyrasense:veyrasense` |
| `/var/lib/veyrasense/backups/` | Automated pre-migration SQLite snapshots (`veyrasense_*.db.bak`). | `0750` `veyrasense:veyrasense` |
| `/var/lib/veyrasense/mosquitto/` | Dynamic Mosquitto passwords (`mosquitto_passwd`) & per-node ACLs (`mosquitto.acl`). | `0750` `veyrasense:mosquitto` |
| `/var/lib/veyrasense/models/` | Machine learning model weights and calibration matrices. | `0750` `veyrasense:veyrasense` |
| `/var/log/veyrasense/` | Standard and error logs (`backend.log`, `mqtt-worker.log`, `deployment.log`). | `0750` `veyrasense:veyrasense` |
| `/etc/veyrasense/veyrasense.env` | Production environment configuration & cryptographic secrets. | `0600` `veyrasense:veyrasense` |

---

## 3. Initial Gateway Setup (Debian 13 Prerequisites)

Run the automated prerequisites installer on the Raspberry Pi 5:

```bash
# Clone repository or transfer deployment package to the Pi
git clone https://github.com/cares-iot/veyrasense.git /tmp/veyrasense
cd /tmp/veyrasense/deployment/raspberry-pi/scripts

# Run root installation script
sudo bash install-prerequisites.sh
```

This installs:
- Python 3.13 (`python3`, `python3-venv`, `python3-pip`)
- Eclipse Mosquitto & clients (`mosquitto`, `mosquitto-clients`)
- Nginx Web Server (`nginx`)
- SQLite 3 (`sqlite3`)
- Creates unprivileged service user `veyrasense`
- Generates directory layout with sandboxed permissions
- Registers systemd units

---

## 4. Production Environment Configuration

Edit `/etc/veyrasense/veyrasense.env` with production secrets:

```bash
sudo nano /etc/veyrasense/veyrasense.env
```

Ensure the following variables are customized:

```ini
ENVIRONMENT=production
PROJECT_NAME="VeyraSense Industrial Edge Gateway"
VERSION="0.3.0"

# Bind strictly to localhost behind Nginx reverse proxy
HOST="127.0.0.1"
PORT=8000
WORKERS=2

# Persistent paths
DATA_DIR="/var/lib/veyrasense/data"
DATABASE_URL="sqlite:////var/lib/veyrasense/data/veyrasense.db"
MOSQUITTO_CONFIG_DIR="/var/lib/veyrasense/mosquitto"
LOG_DIR="/var/log/veyrasense"
BACKUPS_DIR="/var/lib/veyrasense/backups"
MODELS_DIR="/var/lib/veyrasense/models"

# Generate with: openssl rand -hex 32
SECRET_KEY="<64_CHARACTER_RANDOM_HEX_SECRET>"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Mosquitto MQTT Internal Gateway Credentials
MQTT_BROKER_HOST="127.0.0.1"
MQTT_BROKER_PORT=1883
MQTT_BACKEND_USERNAME="veyrasense_backend"
MQTT_BACKEND_PASSWORD="<RANDOM_BACKEND_PASSWORD>"

# Permitted CORS Origins (Local LAN Hostnames / IPs)
CORS_ORIGINS=["http://localhost", "http://127.0.0.1", "http://veyrasense.local"]
```

Set strict file permissions:
```bash
sudo chown veyrasense:veyrasense /etc/veyrasense/veyrasense.env
sudo chmod 0600 /etc/veyrasense/veyrasense.env
```

---

## 5. Executing an Atomic Deployment (`deploy.sh`)

To deploy a new software release without service interruption:

```bash
sudo bash /opt/veyrasense/scripts/deploy.sh /path/to/release_source
```

### Automated Steps Performed by `deploy.sh`:
1. Stages release into `/opt/veyrasense/releases/release_<timestamp>/`.
2. Creates isolated Python 3.13 virtual environment and installs dependencies.
3. Builds React 19 production distribution (`npm run build`).
4. **Mandatory Pre-Migration Backup:** Creates an atomic snapshot (`backup-db.sh`) of `veyrasense.db` before applying migrations.
5. **Alembic Database Migration:** Runs `alembic upgrade head`.
   - *Failure Safeguard:* If migrations fail, the backup is automatically restored, the staging directory is deleted, and `/opt/veyrasense/current` remains untouched!
6. **Atomic Symlink Swap:** Re-points `/opt/veyrasense/current` to the new release using atomic `mv -T`.
7. Restarts `veyrasense-backend.service`, `veyrasense-mqtt-worker.service`, and reloads Nginx.
8. **Health Verification:** Probes `/api/v1/health`. If health check fails within 15 seconds, automatically triggers `rollback.sh` to restore the previous release!
9. Prunes obsolete releases, keeping the 3 most recent.

---

## 6. Manual Rollback Procedure (`rollback.sh`)

If a rollback is required:

```bash
# Roll back to the previous working release (code only):
sudo bash /opt/veyrasense/scripts/rollback.sh

# Roll back code AND restore the latest pre-migration database snapshot:
sudo bash /opt/veyrasense/scripts/rollback.sh "" --restore-db
```

---

## 7. Secure Pi-Initiated Pull Deployment (`pull-deploy.sh`)

To eliminate the need for opening inbound SSH ports on external networks, the Raspberry Pi can pull updates directly from the source repository:

```bash
# Execute manual pull deployment
sudo bash /opt/veyrasense/scripts/pull-deploy.sh
```

Or enable the included daily systemd timer:
```bash
sudo systemctl enable --now veyrasense-update.timer
```

---

## 8. Service Management & Troubleshooting

```bash
# Inspect service statuses
sudo systemctl status veyrasense-backend
sudo systemctl status veyrasense-mqtt-worker
sudo systemctl status mosquitto
sudo systemctl status nginx

# Follow real-time application logs
sudo tail -f /var/log/veyrasense/backend.log
sudo tail -f /var/log/veyrasense/mqtt-worker.log

# Verify Gateway API health
curl -s http://127.0.0.1:8000/api/v1/health | jq .

# Verify Nginx routing
curl -s http://127.0.0.1/api/v1/health | jq .

# Test Mosquitto authentication
mosquitto_sub -h 127.0.0.1 -p 1883 -u veyrasense_backend -P "<PASSWORD>" -t "veyrasense/nodes/+/status"
```
