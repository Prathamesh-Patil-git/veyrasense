#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Production Release Rollback Script
# Reverts /opt/veyrasense/current to specified or previous release
# Safely purges stale SQLite WAL files when restoring database snapshots
# ==============================================================================

set -euo pipefail

BASE_INSTALL_DIR="/opt/veyrasense"
RELEASES_DIR="${BASE_INSTALL_DIR}/releases"
CURRENT_LINK="${BASE_INSTALL_DIR}/current"
DATA_DIR="/var/lib/veyrasense/data"
BACKUPS_DIR="/var/lib/veyrasense/backups"

TARGET_ROLLBACK_DIR="${1:-}"

# Require root
if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] rollback.sh must be executed with root/sudo privileges." >&2
   exit 1
fi

# Acquire deployment lock
LOCK_DIR="/run/lock"
if [[ ! -d "${LOCK_DIR}" ]]; then
    LOCK_DIR="/tmp"
fi
LOCK_FILE="${LOCK_DIR}/veyrasense-deploy.lock"
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
    echo "[ERROR] Another deployment/rollback process is currently running. Exiting." >&2
    exit 1
fi

echo "======================================================================"
echo " VeyraSense — Release Rollback Operation"
echo "======================================================================"

# Determine target release if not specified
if [[ -z "${TARGET_ROLLBACK_DIR}" ]]; then
    CURRENT_TARGET=""
    if [[ -L "${CURRENT_LINK}" ]]; then
        CURRENT_TARGET=$(readlink -f "${CURRENT_LINK}")
    fi

    # Find the latest release that is NOT the currently linked one
    for rel in $(ls -1dt "${RELEASES_DIR}"/release_* 2>/dev/null); do
        if [[ "${rel}" != "${CURRENT_TARGET}" ]]; then
            TARGET_ROLLBACK_DIR="${rel}"
            break
        fi
    done
fi

if [[ -z "${TARGET_ROLLBACK_DIR}" || ! -d "${TARGET_ROLLBACK_DIR}" ]]; then
    echo "[ERROR] No viable previous release found in ${RELEASES_DIR} to roll back to!" >&2
    exit 1
fi

echo "[ROLLBACK] Reverting /opt/veyrasense/current to: ${TARGET_ROLLBACK_DIR}..."

# 1. Stop backend services prior to database rollback if database restoration requested
RESTORE_DB="${2:-false}"
if [[ "${RESTORE_DB}" == "--restore-db" || "${RESTORE_DB}" == "true" ]]; then
    echo "[ROLLBACK] Stopping application daemons prior to database restore..."
    systemctl stop veyrasense-backend.service || true
    systemctl stop veyrasense-mqtt-worker.service || true

    LATEST_BACKUP=$(ls -1t "${BACKUPS_DIR}"/veyrasense_*.db.bak 2>/dev/null | head -n 1)
    if [[ -n "${LATEST_BACKUP}" && -f "${LATEST_BACKUP}" ]]; then
        echo "[ROLLBACK] Restoring database snapshot: ${LATEST_BACKUP}..."
        # Purge stale WAL and shared-memory files to prevent corrupt replay against restored DB
        rm -f "${DATA_DIR}/veyrasense.db-wal" "${DATA_DIR}/veyrasense.db-shm"
        cp -f "${LATEST_BACKUP}" "${DATA_DIR}/veyrasense.db"
        chown veyrasense:veyrasense "${DATA_DIR}/veyrasense.db"
        chmod 0640 "${DATA_DIR}/veyrasense.db"
        echo "[ROLLBACK] Database restored and stale WAL files purged."
    else
        echo "[ROLLBACK-WARN] No backup found in ${BACKUPS_DIR} to restore."
    fi
fi

# 2. Atomic Symlink Swap
ln -sfn "${TARGET_ROLLBACK_DIR}" "${BASE_INSTALL_DIR}/current_next"
mv -T "${BASE_INSTALL_DIR}/current_next" "${CURRENT_LINK}"

# 3. Restart Services
echo "[ROLLBACK] Restarting application daemons..."
systemctl restart veyrasense-backend.service || true
systemctl restart veyrasense-mqtt-worker.service || true
systemctl reload nginx || true

echo "======================================================================"
echo " Rollback completed successfully."
echo " Current release is now: $(readlink -f "${CURRENT_LINK}")"
echo "======================================================================"
exit 0
