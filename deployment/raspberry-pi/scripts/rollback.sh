#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Production Release Rollback
#
# Reverts /opt/veyrasense/current to a selected or previous release.
# Optional database restoration requires an explicitly supplied backup file.
#
# Usage:
#   sudo bash rollback.sh
#   sudo bash rollback.sh /opt/veyrasense/releases/release_TIMESTAMP
#   sudo bash rollback.sh "" --restore-db /path/to/backup.db.bak
#   sudo bash rollback.sh /opt/veyrasense/releases/release_TIMESTAMP \
#       --restore-db /path/to/backup.db.bak
#
# ==============================================================================

set -Eeuo pipefail

BASE_INSTALL_DIR="/opt/veyrasense"
RELEASES_DIR="${BASE_INSTALL_DIR}/releases"
CURRENT_LINK="${BASE_INSTALL_DIR}/current"

DATA_DIR="/var/lib/veyrasense/data"
BACKUPS_DIR="/var/lib/veyrasense/backups"
DB_FILE="${DATA_DIR}/veyrasense.db"

BACKEND_SERVICE="veyrasense-backend.service"
MQTT_SERVICE="veyrasense-mqtt-worker.service"

TARGET_ROLLBACK_DIR="${1:-}"
RESTORE_OPTION="${2:-false}"
DB_BACKUP="${3:-}"

FAILED=0
BACKEND_WAS_ACTIVE=0
MQTT_WAS_ACTIVE=0
NGINX_WAS_ACTIVE=0
SERVICES_STOPPED=0

# ------------------------------------------------------------------------------
# Root and dependency checks
# ------------------------------------------------------------------------------

if [[ "${EUID}" -ne 0 ]]; then
    echo "[ERROR] Run rollback.sh with sudo/root privileges." >&2
    exit 1
fi

for cmd in flock systemctl readlink sqlite3; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "[ERROR] Required command not found: ${cmd}" >&2
        exit 1
    fi
done

if [[ ! -d "${RELEASES_DIR}" ]]; then
    echo "[ERROR] Releases directory does not exist: ${RELEASES_DIR}" >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# Deployment lock
# ------------------------------------------------------------------------------

LOCK_FILE="/run/lock/veyrasense-deploy.lock"
mkdir -p "$(dirname "${LOCK_FILE}")"

exec 200>"${LOCK_FILE}"

if ! flock -n 200; then
    echo "[ERROR] Another deployment or rollback is running." >&2
    exit 1
fi

echo "======================================================================"
echo " VeyraSense — Release Rollback"
echo "======================================================================"

# ------------------------------------------------------------------------------
# Validate database restoration request
# ------------------------------------------------------------------------------

RESTORE_DB=0

if [[ "${RESTORE_OPTION}" == "--restore-db" || "${RESTORE_OPTION}" == "true" ]]; then
    RESTORE_DB=1
elif [[ "${RESTORE_OPTION}" != "false" ]]; then
    echo "[ERROR] Invalid second argument: ${RESTORE_OPTION}" >&2
    echo "[ERROR] Use --restore-db or false." >&2
    exit 1
fi

if [[ "${RESTORE_DB}" -eq 1 ]]; then
    if [[ -z "${DB_BACKUP}" ]]; then
        echo "[ERROR] Database restoration requires an explicit backup path." >&2
        echo "[ERROR] Refusing to guess which backup belongs to this rollback." >&2
        exit 1
    fi

    if [[ ! -f "${DB_BACKUP}" || ! -r "${DB_BACKUP}" ]]; then
        echo "[ERROR] Database backup is missing or unreadable: ${DB_BACKUP}" >&2
        exit 1
    fi

    BACKUP_CHECK="$(sqlite3 "${DB_BACKUP}" 'PRAGMA quick_check;' 2>/dev/null || true)"

    if [[ "${BACKUP_CHECK}" != "ok" ]]; then
        echo "[ERROR] Database backup failed SQLite integrity check." >&2
        exit 1
    fi

    echo "[ROLLBACK] Database backup integrity check passed."
fi

# ------------------------------------------------------------------------------
# Resolve current release
# ------------------------------------------------------------------------------

CURRENT_TARGET=""

if [[ -L "${CURRENT_LINK}" ]]; then
    CURRENT_TARGET="$(readlink -f "${CURRENT_LINK}" || true)"
fi

# ------------------------------------------------------------------------------
# Select previous release if no target was supplied
# ------------------------------------------------------------------------------

if [[ -z "${TARGET_ROLLBACK_DIR}" ]]; then

    mapfile -t CANDIDATE_RELEASES < <(
        find "${RELEASES_DIR}" \
            -mindepth 1 \
            -maxdepth 1 \
            -type d \
            -name 'release_*' \
            -printf '%T@ %p\n' 2>/dev/null |
        sort -nr |
        cut -d' ' -f2-
    )

    for RELEASE in "${CANDIDATE_RELEASES[@]}"; do
        RESOLVED_RELEASE="$(readlink -f "${RELEASE}" || true)"

        if [[ -n "${RESOLVED_RELEASE}" && "${RESOLVED_RELEASE}" != "${CURRENT_TARGET}" ]]; then
            TARGET_ROLLBACK_DIR="${RESOLVED_RELEASE}"
            break
        fi
    done
fi

# ------------------------------------------------------------------------------
# Validate target release
# ------------------------------------------------------------------------------

if [[ -z "${TARGET_ROLLBACK_DIR}" || ! -d "${TARGET_ROLLBACK_DIR}" ]]; then
    echo "[ERROR] No valid rollback release was found." >&2
    exit 1
fi

TARGET_ROLLBACK_DIR="$(readlink -f "${TARGET_ROLLBACK_DIR}")"
RELEASES_REAL="$(readlink -f "${RELEASES_DIR}")"

case "${TARGET_ROLLBACK_DIR}" in
    "${RELEASES_REAL}"/release_*)
        ;;
    *)
        echo "[ERROR] Target release is outside the releases directory." >&2
        echo "[ERROR] Refusing rollback to: ${TARGET_ROLLBACK_DIR}" >&2
        exit 1
        ;;
esac

if [[ "${TARGET_ROLLBACK_DIR}" == "${CURRENT_TARGET}" ]]; then
    echo "[ERROR] Target release is already active." >&2
    exit 1
fi

if [[ ! -x "${TARGET_ROLLBACK_DIR}/backend/.venv/bin/python" ]]; then
    echo "[ERROR] Target release has no executable backend virtual environment." >&2
    exit 1
fi

echo "[ROLLBACK] Current release: ${CURRENT_TARGET:-none}"
echo "[ROLLBACK] Target release:  ${TARGET_ROLLBACK_DIR}"

# ------------------------------------------------------------------------------
# Record service states before changing anything
# ------------------------------------------------------------------------------

systemctl is-active --quiet "${BACKEND_SERVICE}" && BACKEND_WAS_ACTIVE=1 || true
systemctl is-active --quiet "${MQTT_SERVICE}" && MQTT_WAS_ACTIVE=1 || true
systemctl is-active --quiet nginx && NGINX_WAS_ACTIVE=1 || true

# ------------------------------------------------------------------------------
# Stop application services
# ------------------------------------------------------------------------------

echo "[ROLLBACK] Stopping application services..."

systemctl stop "${MQTT_SERVICE}"
systemctl stop "${BACKEND_SERVICE}"

SERVICES_STOPPED=1

# ------------------------------------------------------------------------------
# Optional database restoration
# ------------------------------------------------------------------------------

if [[ "${RESTORE_DB}" -eq 1 ]]; then

    echo "[ROLLBACK] Restoring explicitly selected database backup:"
    echo "           ${DB_BACKUP}"

    mkdir -p "${DATA_DIR}"

    DB_TEMP="${DB_FILE}.rollback.tmp"

    cleanup_temp() {
        rm -f "${DB_TEMP}"
    }

    trap cleanup_temp EXIT

    cp -- "${DB_BACKUP}" "${DB_TEMP}"
    chown veyrasense:veyrasense "${DB_TEMP}"
    chmod 0640 "${DB_TEMP}"

    TEMP_CHECK="$(sqlite3 "${DB_TEMP}" 'PRAGMA quick_check;' 2>/dev/null || true)"

    if [[ "${TEMP_CHECK}" != "ok" ]]; then
        echo "[ERROR] Restored database temporary copy failed integrity check." >&2
        exit 1
    fi

    # Services are stopped, so stale WAL/SHM files can be removed safely.
    rm -f "${DB_FILE}-wal" "${DB_FILE}-shm"

    mv -f "${DB_TEMP}" "${DB_FILE}"

    echo "[ROLLBACK] Database restoration completed."
fi

# ------------------------------------------------------------------------------
# Atomic release symlink swap
# ------------------------------------------------------------------------------

echo "[ROLLBACK] Switching active release..."

TEMP_LINK="${BASE_INSTALL_DIR}/current.rollback.$$"

cleanup_link() {
    rm -f "${TEMP_LINK}"
}

trap cleanup_link EXIT

rm -f "${TEMP_LINK}"
ln -s "${TARGET_ROLLBACK_DIR}" "${TEMP_LINK}"
mv -Tf "${TEMP_LINK}" "${CURRENT_LINK}"

ACTIVE_RELEASE="$(readlink -f "${CURRENT_LINK}")"

if [[ "${ACTIVE_RELEASE}" != "${TARGET_ROLLBACK_DIR}" ]]; then
    echo "[ERROR] Active release symlink verification failed." >&2
    exit 1
fi

echo "[ROLLBACK] Active release symlink updated."

# ------------------------------------------------------------------------------
# Restart only services that were active before rollback
# ------------------------------------------------------------------------------

echo "[ROLLBACK] Restoring previous service states..."

if [[ "${BACKEND_WAS_ACTIVE}" -eq 1 ]]; then
    systemctl start "${BACKEND_SERVICE}"

    if ! systemctl is-active --quiet "${BACKEND_SERVICE}"; then
        echo "[ERROR] Backend failed to start after rollback." >&2
        exit 1
    fi

    echo "[ROLLBACK] Backend service is active."
fi

if [[ "${MQTT_WAS_ACTIVE}" -eq 1 ]]; then
    systemctl start "${MQTT_SERVICE}"

    if ! systemctl is-active --quiet "${MQTT_SERVICE}"; then
        echo "[ERROR] MQTT worker failed to start after rollback." >&2
        exit 1
    fi

    echo "[ROLLBACK] MQTT worker service is active."
fi

if [[ "${NGINX_WAS_ACTIVE}" -eq 1 ]]; then
    systemctl reload nginx

    if ! systemctl is-active --quiet nginx; then
        echo "[ERROR] Nginx is not active after reload." >&2
        exit 1
    fi

    echo "[ROLLBACK] Nginx is active."
fi

# ------------------------------------------------------------------------------
# Final result
# ------------------------------------------------------------------------------

echo ""
echo "======================================================================"
echo "[ROLLBACK-SUCCESS] Rollback completed."
echo "Active release: ${ACTIVE_RELEASE}"

if [[ "${RESTORE_DB}" -eq 1 ]]; then
    echo "Database: restored from ${DB_BACKUP}"
else
    echo "Database: unchanged"
fi

echo "======================================================================"

exit 0
