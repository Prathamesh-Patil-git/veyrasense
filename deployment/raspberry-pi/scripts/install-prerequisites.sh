#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Debian 13 / Raspberry Pi 5 Prerequisite Installer
#
# Run:
#   sudo bash install-prerequisites.sh
#
# Behavior:
# - Validates source files before modifying the system.
# - Validates shell scripts and systemd units.
# - Preserves an existing production environment file.
# - Preserves the Nginx default site.
# - Backs up an existing VeyraSense Nginx configuration.
# - Restores the previous Nginx configuration if validation fails.
# - Does not migrate or modify Mosquitto configuration.
# - Does not start or enable VeyraSense application services.
# - Keeps deployment code root-owned.
# - Keeps application data and logs writable by the service account.
# ==============================================================================

set -Eeuo pipefail
umask 022

# ------------------------------------------------------------------------------
# 1. Root and source directory
# ------------------------------------------------------------------------------

if [[ "${EUID}" -ne 0 ]]; then
    echo "[ERROR] Run this script using sudo." >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENV_TEMPLATE="${SCRIPT_DIR}/../veyrasense.env.production.template"
NGINX_TEMPLATE="${SCRIPT_DIR}/../nginx/veyrasense.conf"
SYSTEMD_SRC_DIR="${SCRIPT_DIR}/../systemd"

TARGET_ENV="/etc/veyrasense/veyrasense.env"

NGINX_AVAILABLE="/etc/nginx/sites-available/veyrasense.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/veyrasense.conf"

BASE_INSTALL_DIR="/opt/veyrasense"
RELEASES_DIR="${BASE_INSTALL_DIR}/releases"
SCRIPTS_DIR="${BASE_INSTALL_DIR}/scripts"

DATA_DIR="/var/lib/veyrasense"
LOG_DIR="/var/log/veyrasense"

MAINTENANCE_SCRIPTS=(
    deploy.sh
    rollback.sh
    backup-db.sh
    health-check.sh
    pull-deploy.sh
)

SYSTEMD_UNITS=(
    veyrasense-backend.service
    veyrasense-mqtt-worker.service
    veyrasense-update.service
    veyrasense-update.timer
)

log() {
    echo "[INFO] $*"
}

die() {
    echo "[ERROR] $*" >&2
    exit 1
}

# ------------------------------------------------------------------------------
# 2. Validate repository source files before system changes
# ------------------------------------------------------------------------------

log "Validating repository source files."

[[ -f "${ENV_TEMPLATE}" ]] ||
    die "Missing environment template: ${ENV_TEMPLATE}"

[[ -f "${NGINX_TEMPLATE}" ]] ||
    die "Missing Nginx template: ${NGINX_TEMPLATE}"

[[ -d "${SYSTEMD_SRC_DIR}" ]] ||
    die "Missing systemd directory: ${SYSTEMD_SRC_DIR}"

for file in "${MAINTENANCE_SCRIPTS[@]}"; do
    [[ -f "${SCRIPT_DIR}/${file}" ]] ||
        die "Missing maintenance script: ${SCRIPT_DIR}/${file}"
done

for file in "${SYSTEMD_UNITS[@]}"; do
    [[ -f "${SYSTEMD_SRC_DIR}/${file}" ]] ||
        die "Missing systemd unit: ${SYSTEMD_SRC_DIR}/${file}"
done

# ------------------------------------------------------------------------------
# 3. Validate shell scripts and systemd units
# ------------------------------------------------------------------------------

log "Checking shell script syntax."

for file in "${MAINTENANCE_SCRIPTS[@]}"; do
    bash -n "${SCRIPT_DIR}/${file}" ||
        die "Shell syntax validation failed: ${file}"
done

log "Checking systemd unit syntax."

if ! command -v systemd-analyze >/dev/null 2>&1; then
    die "systemd-analyze is unavailable."
fi

for file in "${SYSTEMD_UNITS[@]}"; do
    systemd-analyze verify "${SYSTEMD_SRC_DIR}/${file}" ||
        die "Systemd unit validation failed: ${file}"
done

# ------------------------------------------------------------------------------
# 4. Validate existing Nginx VeyraSense entry
#
# Never remove or modify the default Nginx site.
# Never silently replace an unexpected enabled symlink.
# ------------------------------------------------------------------------------

if [[ -e "${NGINX_ENABLED}" || -L "${NGINX_ENABLED}" ]]; then

    if [[ ! -L "${NGINX_ENABLED}" ]]; then
        die "${NGINX_ENABLED} exists but is not a symlink. Inspect manually."
    fi

    EXISTING_TARGET="$(readlink -f "${NGINX_ENABLED}" || true)"
    EXPECTED_TARGET="$(readlink -m "${NGINX_AVAILABLE}")"

    [[ "${EXISTING_TARGET}" == "${EXPECTED_TARGET}" ]] ||
        die "Existing VeyraSense Nginx symlink points to an unexpected target: ${EXISTING_TARGET}"
fi

log "Source validation completed."

# ------------------------------------------------------------------------------
# 5. Install system packages
# ------------------------------------------------------------------------------

log "Updating Debian package lists."

apt-get update

log "Installing required Debian packages."

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
    ca-certificates \
    openssh-client \
    build-essential \
    libffi-dev \
    libssl-dev \
    pkg-config \
    util-linux

PYTHON_VERSION="$(python3 --version)"
log "System Python: ${PYTHON_VERSION}"

# ------------------------------------------------------------------------------
# 6. Create VeyraSense service account
# ------------------------------------------------------------------------------

log "Configuring VeyraSense service account."

if ! id veyrasense >/dev/null 2>&1; then
    useradd -r \
        -s /usr/sbin/nologin \
        -d "${DATA_DIR}" \
        -c "VeyraSense Service User" \
        veyrasense
fi

# Add to mosquitto group only if that group exists.
if getent group mosquitto >/dev/null 2>&1; then
    usermod -aG mosquitto veyrasense
fi

# ------------------------------------------------------------------------------
# 7. Create persistent directories
#
# Application data and logs are writable by veyrasense.
# Deployment code and release directories remain root-owned.
# ------------------------------------------------------------------------------

log "Creating persistent and deployment directories."

install -d -o veyrasense -g veyrasense -m 0750 \
    "${DATA_DIR}" \
    "${DATA_DIR}/data" \
    "${DATA_DIR}/backups" \
    "${DATA_DIR}/models" \
    "${LOG_DIR}"

install -d -o root -g root -m 0755 \
    "${BASE_INSTALL_DIR}" \
    "${RELEASES_DIR}" \
    "${SCRIPTS_DIR}"

install -d -o root -g root -m 0750 \
    /etc/veyrasense

# Dedicated persistent Mosquitto configuration directory.
install -d -o root -g mosquitto -m 0750 \
    "${DATA_DIR}/mosquitto"

# ------------------------------------------------------------------------------
# 8. Production environment file
#
# Preserve existing credentials and settings.
# New files are created root-owned and readable only by root.
# ------------------------------------------------------------------------------

log "Checking production environment configuration."

if [[ ! -e "${TARGET_ENV}" ]]; then

    install -o root -g root -m 0600 \
        "${ENV_TEMPLATE}" "${TARGET_ENV}"

    log "Created environment file from production template."

else

    log "Existing environment file preserved."

    # Normalize permissions without changing its contents.
    chown root:root "${TARGET_ENV}"
    chmod 0600 "${TARGET_ENV}"
fi

# ------------------------------------------------------------------------------
# 9. Install Nginx configuration safely
#
# Back up an existing VeyraSense site configuration.
# Restore it if nginx -t fails.
# ------------------------------------------------------------------------------

log "Installing VeyraSense Nginx configuration."

install -d -o root -g root -m 0755 \
    /etc/nginx/sites-available \
    /etc/nginx/sites-enabled

NGINX_BACKUP=""

if [[ -f "${NGINX_AVAILABLE}" ]]; then

    NGINX_BACKUP="${NGINX_AVAILABLE}.backup.$(date -u +%Y%m%d_%H%M%S)"

    cp -a "${NGINX_AVAILABLE}" "${NGINX_BACKUP}"

    log "Previous VeyraSense Nginx configuration backed up to ${NGINX_BACKUP}"
fi

NGINX_TEMP="${NGINX_AVAILABLE}.new.$$"

cleanup_nginx_temp() {
    rm -f "${NGINX_TEMP}"
}

trap cleanup_nginx_temp EXIT

install -o root -g root -m 0644 \
    "${NGINX_TEMPLATE}" "${NGINX_TEMP}"

mv -f "${NGINX_TEMP}" "${NGINX_AVAILABLE}"

if [[ ! -e "${NGINX_ENABLED}" && ! -L "${NGINX_ENABLED}" ]]; then
    ln -s "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
fi

if ! nginx -t; then

    echo "[ERROR] New Nginx configuration failed validation." >&2

    if [[ -n "${NGINX_BACKUP}" && -f "${NGINX_BACKUP}" ]]; then
        cp -a "${NGINX_BACKUP}" "${NGINX_AVAILABLE}"
        echo "[INFO] Previous VeyraSense Nginx configuration restored." >&2
    else
        rm -f "${NGINX_AVAILABLE}"
        rm -f "${NGINX_ENABLED}"
        echo "[INFO] Newly installed VeyraSense Nginx configuration removed." >&2
    fi

    exit 1
fi

log "Nginx configuration validation passed."

# Reload only after successful validation.
systemctl reload nginx

# ------------------------------------------------------------------------------
# 10. Install maintenance scripts
#
# Root-owned scripts prevent modification by the application service account.
# ------------------------------------------------------------------------------

log "Installing VeyraSense maintenance scripts."

for file in "${MAINTENANCE_SCRIPTS[@]}"; do

    install -o root -g root -m 0755 \
        "${SCRIPT_DIR}/${file}" \
        "${SCRIPTS_DIR}/${file}"

done

# ------------------------------------------------------------------------------
# 11. Install systemd unit files
# ------------------------------------------------------------------------------

log "Installing VeyraSense systemd units."

for file in "${SYSTEMD_UNITS[@]}"; do

    install -o root -g root -m 0644 \
        "${SYSTEMD_SRC_DIR}/${file}" \
        "/etc/systemd/system/${file}"

done

systemctl daemon-reload

# ------------------------------------------------------------------------------
# 12. Keep VeyraSense services stopped and disabled
#
# This ensures fresh deployment begins in a clean stopped state.
# ------------------------------------------------------------------------------

log "Keeping VeyraSense application services disabled."

for unit in \
    veyrasense-backend.service \
    veyrasense-mqtt-worker.service \
    veyrasense-update.service \
    veyrasense-update.timer
do

    systemctl disable --now "${unit}" || {
        log "Unit ${unit} was already disabled or inactive."
    }

done

# Confirm application services are stopped.
for unit in \
    veyrasense-backend.service \
    veyrasense-mqtt-worker.service \
    veyrasense-update.service \
    veyrasense-update.timer
do

    if systemctl is-active --quiet "${unit}"; then
        die "${unit} is unexpectedly active."
    fi

done

# ------------------------------------------------------------------------------
# 13. Verify existing Mosquitto service was not stopped
# ------------------------------------------------------------------------------

if ! systemctl is-active --quiet mosquitto; then
    log "WARNING: Mosquitto is not currently active. No Mosquitto configuration was changed."
else
    log "Existing Mosquitto service remains active."
fi

# ------------------------------------------------------------------------------
# 14. Final result
# ------------------------------------------------------------------------------

echo "======================================================================"
echo " VeyraSense prerequisite installation complete."
echo ""
echo " Production environment:"
echo "   ${TARGET_ENV}"
echo ""
echo " Deployment scripts:"
echo "   ${SCRIPTS_DIR}"
echo ""
echo " Persistent application data:"
echo "   ${DATA_DIR}"
echo ""
echo " Persistent application logs:"
echo "   ${LOG_DIR}"
echo ""
echo " Nginx:"
echo "   VeyraSense site installed and validated."
echo "   Existing default site was not removed."
echo ""
echo " Mosquitto:"
echo "   Dedicated VeyraSense broker configuration installed."
echo ""
echo " Application services:"
echo "   Backend:     stopped"
echo "   MQTT worker: stopped"
echo "   Update:      stopped"
echo "   Timer:       stopped"
echo ""
echo " Next:"
echo "   Configure production environment values."
echo "   Verify GitHub deployment key and API token configuration."
echo "   Deploy VeyraSense before enabling its services."
echo "======================================================================"

exit 0
