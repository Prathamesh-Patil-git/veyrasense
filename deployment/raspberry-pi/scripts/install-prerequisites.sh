#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Debian 13 (ARM64) Prerequisites & System Installation Script
# Target: Raspberry Pi 5 (Debian 13 Trixie / Raspberry Pi OS 64-bit)
# Run as: sudo bash install-prerequisites.sh
#
# Preserves existing Mosquitto configurations and CARES-RX data.
# ==============================================================================

set -euo pipefail

# Require root
if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] This installation script must be run as root (e.g., using sudo)." >&2
   exit 1
fi

echo "======================================================================"
echo " VeyraSense Edge Gateway — System Installation (Debian 13 ARM64)"
echo "======================================================================"

# 1. Update APT and install required core system packages
echo "[1/7] Updating APT repositories and installing dependencies..."
apt-get update -y
apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    sqlite3 \
    mosquitto \
    mosquitto-clients \
    nginx \
    curl \
    git \
    libffi-dev \
    build-essential \
    ca-certificates

# Verify Python version (Debian 13 default is Python 3.13)
PYTHON_VER=$(python3 --version 2>&1)
echo "[INFO] Detected system Python: ${PYTHON_VER}"

# 2. Create unprivileged system user for sandboxing
echo "[2/7] Configuring 'veyrasense' service user..."
if ! id -u veyrasense >/dev/null 2>&1; then
    useradd -r -s /usr/sbin/nologin -d /var/lib/veyrasense -c "VeyraSense Service User" veyrasense
    echo "[INFO] Created system user 'veyrasense'."
else
    echo "[INFO] User 'veyrasense' already exists."
fi

# Add veyrasense to mosquitto group if present
if getent group mosquitto >/dev/null 2>&1; then
    usermod -aG mosquitto veyrasense
fi

# 3. Create persistent directory hierarchy outside release folders
echo "[3/7] Initializing persistent directory layout..."
mkdir -p /var/lib/veyrasense/data \
         /var/lib/veyrasense/backups \
         /var/lib/veyrasense/models \
         /var/lib/veyrasense/mosquitto \
         /var/log/veyrasense \
         /etc/veyrasense \
         /opt/veyrasense/releases \
         /opt/veyrasense/scripts

# Permissions & Ownership
chown -R veyrasense:veyrasense /var/lib/veyrasense /var/log/veyrasense /opt/veyrasense
chmod 0750 /var/lib/veyrasense /var/lib/veyrasense/data /var/lib/veyrasense/backups /var/log/veyrasense

# 4. Copy configuration template if not already present
echo "[4/7] Checking production configuration template..."
if [[ ! -f /etc/veyrasense/veyrasense.env ]]; then
    if [[ -f ../veyrasense.env.production.template ]]; then
        cp ../veyrasense.env.production.template /etc/veyrasense/veyrasense.env
    elif [[ -f deployment/raspberry-pi/veyrasense.env.production.template ]]; then
        cp deployment/raspberry-pi/veyrasense.env.production.template /etc/veyrasense/veyrasense.env
    fi
    chown veyrasense:veyrasense /etc/veyrasense/veyrasense.env
    chmod 0600 /etc/veyrasense/veyrasense.env
    echo "[IMPORTANT] Created /etc/veyrasense/veyrasense.env. Please edit with secure production secrets."
fi

# 5. Configure Mosquitto (Preserve existing broker config and CARES-RX data)
echo "[5/7] Configuring Mosquitto with coexistence protection..."
mkdir -p /etc/mosquitto/conf.d

# Backup existing Mosquitto configurations before modifying
if [[ -d /etc/mosquitto && ! -d /var/lib/veyrasense/backups/mosquitto_preinstall ]]; then
    echo "[INFO] Backing up existing /etc/mosquitto to /var/lib/veyrasense/backups/mosquitto_preinstall..."
    cp -a /etc/mosquitto /var/lib/veyrasense/backups/mosquitto_preinstall
fi

MOSQUITTO_CONF_SRC=""
if [[ -f ../../mosquitto/mosquitto.conf ]]; then
    MOSQUITTO_CONF_SRC="../../mosquitto/mosquitto.conf"
elif [[ -f deployment/mosquitto/mosquitto.conf ]]; then
    MOSQUITTO_CONF_SRC="deployment/mosquitto/mosquitto.conf"
fi

if [[ -n "${MOSQUITTO_CONF_SRC}" ]]; then
    # Install as non-conflicting drop-in 99-veyrasense.conf
    cp "${MOSQUITTO_CONF_SRC}" /etc/mosquitto/conf.d/99-veyrasense.conf
    echo "[INFO] Installed /etc/mosquitto/conf.d/99-veyrasense.conf."
fi

# Restart mosquitto safely; if it fails (e.g. duplicate listener in legacy main config), report warning
if ! systemctl restart mosquitto; then
    echo "[WARN] Mosquitto restart failed. An existing listener or configuration may be active."
    echo "[WARN] Existing CARES-RX configurations preserved. Please inspect /etc/mosquitto/conf.d/99-veyrasense.conf."
else
    systemctl enable mosquitto || true
    echo "[INFO] Mosquitto broker active."
fi

# 6. Configure Nginx
echo "[6/7] Setting up Nginx reverse proxy..."
if [[ -f ../nginx/veyrasense.conf ]]; then
    cp ../nginx/veyrasense.conf /etc/nginx/sites-available/veyrasense.conf
elif [[ -f deployment/raspberry-pi/nginx/veyrasense.conf ]]; then
    cp deployment/raspberry-pi/nginx/veyrasense.conf /etc/nginx/sites-available/veyrasense.conf
fi
# Disable default nginx site and enable veyrasense
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/veyrasense.conf /etc/nginx/sites-enabled/veyrasense.conf
nginx -t && systemctl reload nginx || true

# 7. Install deployment scripts and systemd units
echo "[7/7] Installing scripts and systemd units..."
# Copy maintenance scripts to /opt/veyrasense/scripts/
SCRIPT_SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "${SCRIPT_SRC_DIR}"/deploy.sh /opt/veyrasense/scripts/
cp "${SCRIPT_SRC_DIR}"/rollback.sh /opt/veyrasense/scripts/
cp "${SCRIPT_SRC_DIR}"/backup-db.sh /opt/veyrasense/scripts/
cp "${SCRIPT_SRC_DIR}"/health-check.sh /opt/veyrasense/scripts/
cp "${SCRIPT_SRC_DIR}"/pull-deploy.sh /opt/veyrasense/scripts/
chmod 0755 /opt/veyrasense/scripts/*.sh
chown -R veyrasense:veyrasense /opt/veyrasense/scripts

# Install systemd units
SYSTEMD_SRC_DIR=""
if [[ -d "${SCRIPT_SRC_DIR}/../systemd" ]]; then
    SYSTEMD_SRC_DIR="${SCRIPT_SRC_DIR}/../systemd"
elif [[ -d deployment/raspberry-pi/systemd ]]; then
    SYSTEMD_SRC_DIR="deployment/raspberry-pi/systemd"
fi

if [[ -n "${SYSTEMD_SRC_DIR}" ]]; then
    cp "${SYSTEMD_SRC_DIR}"/veyrasense-backend.service /etc/systemd/system/
    cp "${SYSTEMD_SRC_DIR}"/veyrasense-mqtt-worker.service /etc/systemd/system/
    cp "${SYSTEMD_SRC_DIR}"/veyrasense-update.service /etc/systemd/system/
    cp "${SYSTEMD_SRC_DIR}"/veyrasense-update.timer /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable veyrasense-backend.service
    systemctl enable veyrasense-mqtt-worker.service
    systemctl enable veyrasense-update.timer
    echo "[INFO] Systemd units registered and enabled."
fi

echo "======================================================================"
echo " Prerequisites installation complete."
echo " Next step: Deploy application release using /opt/veyrasense/scripts/deploy.sh"
echo "======================================================================"
