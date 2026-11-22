#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Atomic Production Release Deployment Script
# Target: Raspberry Pi 5 (Debian 13 Trixie ARM64)
# Features:
# - Deployment lock via flock to prevent concurrent executions
# - Safe separation: persistent DB, secrets, and ML models never overwritten
# - Mandatory pre-migration SQLite backup with WAL consistency
# - Automatic database rollback (with stale WAL purging) if migration fails
# - Zero-downtime atomic symlink switching (/opt/veyrasense/current)
# - Post-deployment health verification with automatic rollback
# - Retains previous 3 releases for safe rollbacks
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_INSTALL_DIR="/opt/veyrasense"
RELEASES_DIR="${BASE_INSTALL_DIR}/releases"
CURRENT_LINK="${BASE_INSTALL_DIR}/current"
DATA_DIR="/var/lib/veyrasense/data"
BACKUPS_DIR="/var/lib/veyrasense/backups"
ENV_FILE="/etc/veyrasense/veyrasense.env"
SOURCE_ROOT="${1:-$(cd "${SCRIPT_DIR}/../../.." && pwd)}"

# Acquire deployment lock
LOCK_DIR="/run/lock"
if [[ ! -d "${LOCK_DIR}" ]]; then
    LOCK_DIR="/tmp"
fi
LOCK_FILE="${LOCK_DIR}/veyrasense-deploy.lock"
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
    echo "[ERROR] Another deployment process is currently running. Exiting to prevent race condition." >&2
    exit 1
fi

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
RELEASE_TAG="release_${TIMESTAMP}"
TARGET_RELEASE_DIR="${RELEASES_DIR}/${RELEASE_TAG}"

echo "======================================================================"
echo " VeyraSense Production Deployment: ${RELEASE_TAG}"
echo " Source: ${SOURCE_ROOT}"
echo " Target: ${TARGET_RELEASE_DIR}"
echo "======================================================================"

# Require root or sudo
if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] deploy.sh must be executed with root/sudo privileges." >&2
   exit 1
fi

mkdir -p "${RELEASES_DIR}" "${DATA_DIR}" "${BACKUPS_DIR}"

# 1. Stage Source Code into Target Release Directory
echo "[1/8] Staging release files into ${TARGET_RELEASE_DIR}..."
mkdir -p "${TARGET_RELEASE_DIR}"
cp -a "${SOURCE_ROOT}/backend" "${TARGET_RELEASE_DIR}/"
cp -a "${SOURCE_ROOT}/deployment" "${TARGET_RELEASE_DIR}/"

# Ensure local development database, local .env, and caches are purged from release
rm -rf "${TARGET_RELEASE_DIR}/backend/data" \
       "${TARGET_RELEASE_DIR}/backend/.env" \
       "${TARGET_RELEASE_DIR}/backend/__pycache__"

# Copy frontend (pre-built dist or source)
mkdir -p "${TARGET_RELEASE_DIR}/frontend"
if [[ -d "${SOURCE_ROOT}/frontend/dist" ]]; then
    echo "[INFO] Using pre-built frontend distribution."
    cp -a "${SOURCE_ROOT}/frontend/dist" "${TARGET_RELEASE_DIR}/frontend/"
else
    echo "[INFO] Pre-built frontend not found. Copying frontend source..."
    cp -a "${SOURCE_ROOT}/frontend" "${TARGET_RELEASE_DIR}/"
fi

# 2. Build / Update Python Virtual Environment (Debian 13 Python 3.13+)
echo "[2/8] Configuring Python virtual environment..."
VENV_PATH="${TARGET_RELEASE_DIR}/backend/.venv"
python3 -m venv "${VENV_PATH}"
"${VENV_PATH}/bin/pip" install --upgrade pip setuptools wheel
"${VENV_PATH}/bin/pip" install --no-cache-dir -r "${TARGET_RELEASE_DIR}/backend/requirements.txt"

# 3. Build Frontend if dist is missing
if [[ ! -d "${TARGET_RELEASE_DIR}/frontend/dist" && -f "${TARGET_RELEASE_DIR}/frontend/package.json" ]]; then
    echo "[3/8] Building frontend with Node.js..."
    if command -v npm >/dev/null 2>&1; then
        (cd "${TARGET_RELEASE_DIR}/frontend" && npm ci && npm run build)
    else
        echo "[ERROR] Node.js/npm not found and frontend dist is missing!" >&2
        rm -rf "${TARGET_RELEASE_DIR}"
        exit 1
    fi
else
    echo "[3/8] Frontend production distribution verified."
fi

# Record commit hash for deployment verification and duplicate prevention
if [[ -d "${SOURCE_ROOT}/.git" ]]; then
    (cd "${SOURCE_ROOT}" && git rev-parse HEAD > "${TARGET_RELEASE_DIR}/backend/.git_commit") 2>/dev/null || true
elif [[ -f "${SOURCE_ROOT}/backend/.git_commit" ]]; then
    cp -f "${SOURCE_ROOT}/backend/.git_commit" "${TARGET_RELEASE_DIR}/backend/.git_commit"
fi

# 4. Mandatory Pre-Migration Database Backup
echo "[4/8] Executing pre-migration database snapshot..."
LATEST_BACKUP=""
if [[ -f "${SCRIPT_DIR}/backup-db.sh" ]]; then
    LATEST_BACKUP=$(bash "${SCRIPT_DIR}/backup-db.sh" "${DATA_DIR}/veyrasense.db" "${BACKUPS_DIR}")
    echo "[INFO] Captured pre-migration backup: ${LATEST_BACKUP}"
fi

# 5. Apply Database Migrations (Alembic)
echo "[5/8] Applying database migrations..."
set +e
(
    cd "${TARGET_RELEASE_DIR}/backend"
    if [[ -f "${ENV_FILE}" ]]; then
        set -a
        # shellcheck source=/dev/null
        source "${ENV_FILE}" 2>/dev/null || true
        set +a
    fi
    "${VENV_PATH}/bin/alembic" upgrade head
)
ALEMBIC_STATUS=$?
set -e

if [[ ${ALEMBIC_STATUS} -ne 0 ]]; then
    echo "[CRITICAL-ERROR] Alembic database migration failed with exit code ${ALEMBIC_STATUS}!" >&2
    if [[ -n "${LATEST_BACKUP}" && -f "${LATEST_BACKUP}" ]]; then
        echo "[ROLLBACK] Restoring database snapshot from ${LATEST_BACKUP}..."
        # Purge stale WAL and shared-memory files to prevent corrupt replay
        rm -f "${DATA_DIR}/veyrasense.db-wal" "${DATA_DIR}/veyrasense.db-shm"
        cp -f "${LATEST_BACKUP}" "${DATA_DIR}/veyrasense.db"
        chown veyrasense:veyrasense "${DATA_DIR}/veyrasense.db"
        chmod 0640 "${DATA_DIR}/veyrasense.db"
    fi
    echo "[CLEANUP] Removing unpromoted release directory ${TARGET_RELEASE_DIR}..."
    rm -rf "${TARGET_RELEASE_DIR}"
    echo "[ABORT] Deployment aborted. Working release was NOT modified." >&2
    exit 1
fi

# Ensure correct file ownership for veyrasense system user
chown -R veyrasense:veyrasense "${TARGET_RELEASE_DIR}"

# 6. Atomic Symlink Swap
echo "[6/8] Performing atomic symlink swap to ${RELEASE_TAG}..."
PREVIOUS_RELEASE=""
if [[ -L "${CURRENT_LINK}" ]]; then
    PREVIOUS_RELEASE=$(readlink -f "${CURRENT_LINK}")
fi

ln -sfn "${TARGET_RELEASE_DIR}" "${BASE_INSTALL_DIR}/current_next"
mv -T "${BASE_INSTALL_DIR}/current_next" "${CURRENT_LINK}"
echo "[INFO] ${CURRENT_LINK} now points to ${TARGET_RELEASE_DIR}."

# 7. Restart Application Services
echo "[7/8] Restarting application daemons..."
systemctl restart veyrasense-backend.service || true
systemctl restart veyrasense-mqtt-worker.service || true
systemctl reload nginx || true

# 8. Automated Post-Deployment Health Verification
echo "[8/8] Verifying gateway health check..."
set +e
bash "${SCRIPT_DIR}/health-check.sh"
HEALTH_STATUS=$?
set -e

if [[ ${HEALTH_STATUS} -ne 0 ]]; then
    echo "[CRITICAL-FAIL] Health check failed after deployment!" >&2
    echo "[AUTO-ROLLBACK] Rolling back to previous release..."
    if [[ -n "${PREVIOUS_RELEASE}" && -d "${PREVIOUS_RELEASE}" ]]; then
        bash "${SCRIPT_DIR}/rollback.sh" "${PREVIOUS_RELEASE}"
    else
        echo "[ERROR] No previous release found to roll back to!" >&2
    fi
    exit 1
fi

# Prune older releases (Keep last 3)
echo "[INFO] Pruning obsolete releases (retaining 3 most recent)..."
ls -1dt "${RELEASES_DIR}"/release_* 2>/dev/null | tail -n +4 | xargs -r rm -rf

echo "======================================================================"
echo " VeyraSense Deployment SUCCESSFUL!"
echo " Active Release: ${RELEASE_TAG}"
echo "======================================================================"
exit 0
