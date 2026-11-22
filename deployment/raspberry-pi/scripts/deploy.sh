#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Atomic Production Release Deployment
# Target: Raspberry Pi 5 / Debian 13 ARM64
#
# Features:
# - One deployment lock, owned by pull-deploy.sh or this script
# - Atomic release creation and symlink promotion
# - Per-release Python virtual environment
# - Correct frontend build and staging
# - SQLite backup before migration
# - Application services stopped during migration
# - Automatic rollback of release and database on failure
# - Health verification before accepting deployment
# - Preserves active and previous releases
# - Persistent application data remains outside release directories
#
# Usage:
#   sudo bash deploy.sh /path/to/staged/repository
#
# The caller may set DEPLOY_LOCK_HELD=1 if it already owns the deployment lock.
# ==============================================================================

set -Eeuo pipefail

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BASE_INSTALL_DIR="/opt/veyrasense"
RELEASES_DIR="${BASE_INSTALL_DIR}/releases"
CURRENT_LINK="${BASE_INSTALL_DIR}/current"

DATA_DIR="/var/lib/veyrasense/data"
BACKUPS_DIR="/var/lib/veyrasense/backups"

ENV_FILE="/etc/veyrasense/veyrasense.env"
DB_FILE="${DATA_DIR}/veyrasense.db"

BACKEND_SERVICE="veyrasense-backend.service"
MQTT_SERVICE="veyrasense-mqtt-worker.service"
UPDATE_TIMER="veyrasense-update.timer"

SOURCE_ROOT="${1:-}"

# ------------------------------------------------------------------------------
# Root check
# ------------------------------------------------------------------------------

if [[ "${EUID}" -ne 0 ]]; then
    echo "[ERROR] deploy.sh must run as root." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# Deployment lock
#
# pull-deploy.sh owns the lock when it launches this script.
# Direct/manual invocations acquire it here.
# ------------------------------------------------------------------------------

LOCK_FILE="/run/lock/veyrasense-deploy.lock"
mkdir -p "$(dirname "${LOCK_FILE}")"

if [[ "${DEPLOY_LOCK_HELD:-0}" != "1" ]]; then
    exec 200>"${LOCK_FILE}"

    if ! flock -n 200; then
        echo "[ERROR] Another deployment or rollback is running." >&2
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# Validate source
# ------------------------------------------------------------------------------

if [[ -z "${SOURCE_ROOT}" ]]; then
    echo "[ERROR] Source repository path is required." >&2
    echo "Usage: sudo bash deploy.sh /path/to/staged/repository" >&2
    exit 1
fi

SOURCE_ROOT="$(readlink -f "${SOURCE_ROOT}")"

if [[ ! -d "${SOURCE_ROOT}/backend" ]]; then
    echo "[ERROR] Backend source directory is missing." >&2
    exit 1
fi

if [[ ! -f "${SOURCE_ROOT}/backend/requirements.txt" ]]; then
    echo "[ERROR] backend/requirements.txt is missing." >&2
    exit 1
fi

if [[ ! -f "${SOURCE_ROOT}/backend/alembic.ini" ]]; then
    echo "[ERROR] backend/alembic.ini is missing." >&2
    exit 1
fi

if [[ ! -d "${SOURCE_ROOT}/frontend" ]]; then
    echo "[ERROR] Frontend source directory is missing." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# Required commands
# ------------------------------------------------------------------------------

for cmd in python3 systemctl sqlite3 curl flock; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
        echo "[ERROR] Required command not found: ${cmd}" >&2
        exit 1
    fi
done

# ------------------------------------------------------------------------------
# Persistent directory preparation
# ------------------------------------------------------------------------------

mkdir -p \
    "${RELEASES_DIR}" \
    "${DATA_DIR}" \
    "${BACKUPS_DIR}"

# ------------------------------------------------------------------------------
# Deployment state
# ------------------------------------------------------------------------------

TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
RELEASE_TAG="release_${TIMESTAMP}"
TARGET_RELEASE_DIR="${RELEASES_DIR}/${RELEASE_TAG}"

PREVIOUS_RELEASE=""
PREVIOUS_DB_EXISTED=0
BACKUP_FILE=""

BACKEND_WAS_ACTIVE=0
MQTT_WAS_ACTIVE=0
NGINX_WAS_ACTIVE=0
UPDATE_TIMER_WAS_ACTIVE=0

RELEASE_PROMOTED=0
MIGRATION_STARTED=0
DEPLOYMENT_SUCCEEDED=0
ROLLBACK_IN_PROGRESS=0

# ------------------------------------------------------------------------------
# Record original release and service states
# ------------------------------------------------------------------------------

if [[ -L "${CURRENT_LINK}" ]]; then
    PREVIOUS_RELEASE="$(readlink -f "${CURRENT_LINK}" || true)"
fi

systemctl is-active --quiet "${BACKEND_SERVICE}" && BACKEND_WAS_ACTIVE=1 || true
systemctl is-active --quiet "${MQTT_SERVICE}" && MQTT_WAS_ACTIVE=1 || true
systemctl is-active --quiet nginx && NGINX_WAS_ACTIVE=1 || true
systemctl is-active --quiet "${UPDATE_TIMER}" && UPDATE_TIMER_WAS_ACTIVE=1 || true

if [[ -f "${DB_FILE}" ]]; then
    PREVIOUS_DB_EXISTED=1
fi

echo "======================================================================"
echo " VeyraSense Production Deployment"
echo " Release: ${RELEASE_TAG}"
echo " Source:  ${SOURCE_ROOT}"
echo " Previous release: ${PREVIOUS_RELEASE:-none}"
echo "======================================================================"

# ------------------------------------------------------------------------------
# Rollback handler
# ------------------------------------------------------------------------------

rollback_deployment() {

    if [[ "${ROLLBACK_IN_PROGRESS}" -eq 1 ]]; then
        return
    fi

    ROLLBACK_IN_PROGRESS=1

    echo ""
    echo "[ROLLBACK] Deployment failed. Beginning automatic recovery." >&2

    # Stop application processes before touching SQLite.
    systemctl stop "${MQTT_SERVICE}" >/dev/null 2>&1 || true
    systemctl stop "${BACKEND_SERVICE}" >/dev/null 2>&1 || true

    # Restore previous database state if migration had started.
    if [[ "${MIGRATION_STARTED}" -eq 1 ]]; then

        if [[ "${PREVIOUS_DB_EXISTED}" -eq 1 ]]; then

            if [[ -n "${BACKUP_FILE}" && -f "${BACKUP_FILE}" ]]; then

                echo "[ROLLBACK] Restoring pre-migration database backup."

                RESTORE_TEMP="${DB_FILE}.restore.tmp"

                if cp -- "${BACKUP_FILE}" "${RESTORE_TEMP}" &&
                    sqlite3 "${RESTORE_TEMP}" 'PRAGMA quick_check;' 2>/dev/null |
                    grep -qx "ok"; then

                    chown veyrasense:veyrasense "${RESTORE_TEMP}"
                    chmod 0640 "${RESTORE_TEMP}"

                    rm -f "${DB_FILE}-wal" "${DB_FILE}-shm"

                    mv -f "${RESTORE_TEMP}" "${DB_FILE}"

                    echo "[ROLLBACK] Database restored successfully."
                else
                    rm -f "${RESTORE_TEMP}"
                    echo "[ROLLBACK-CRITICAL] Database backup restoration failed." >&2
                fi

            else
                echo "[ROLLBACK-CRITICAL] Pre-migration backup is missing." >&2
            fi

        else
            # The database did not exist before deployment.
            # Remove a newly created database after stopping services.
            echo "[ROLLBACK] Removing database created by failed initial migration."
            rm -f "${DB_FILE}" "${DB_FILE}-wal" "${DB_FILE}-shm"
        fi
    fi

    # Restore previous release symlink.
    if [[ -n "${PREVIOUS_RELEASE}" && -d "${PREVIOUS_RELEASE}" ]]; then

        echo "[ROLLBACK] Restoring previous release: ${PREVIOUS_RELEASE}"

        TEMP_LINK="${BASE_INSTALL_DIR}/current.rollback.$$"

        rm -f "${TEMP_LINK}"

        if ln -s "${PREVIOUS_RELEASE}" "${TEMP_LINK}" &&
            mv -Tf "${TEMP_LINK}" "${CURRENT_LINK}"; then

            echo "[ROLLBACK] Previous release restored."
        else
            echo "[ROLLBACK-CRITICAL] Failed to restore previous release symlink." >&2
        fi

    elif [[ "${RELEASE_PROMOTED}" -eq 1 ]]; then

        echo "[ROLLBACK-WARN] No previous release was available." >&2
        rm -f "${CURRENT_LINK}"
    fi

    # Restore service running states.
    if [[ "${BACKEND_WAS_ACTIVE}" -eq 1 ]]; then
        systemctl start "${BACKEND_SERVICE}" || \
            echo "[ROLLBACK-ERROR] Backend failed to restart." >&2
    fi

    if [[ "${MQTT_WAS_ACTIVE}" -eq 1 ]]; then
        systemctl start "${MQTT_SERVICE}" || \
            echo "[ROLLBACK-ERROR] MQTT worker failed to restart." >&2
    fi

    if [[ "${NGINX_WAS_ACTIVE}" -eq 1 ]]; then
        systemctl reload nginx || \
            echo "[ROLLBACK-WARN] Nginx reload failed." >&2
    fi

    if [[ "${UPDATE_TIMER_WAS_ACTIVE}" -eq 1 ]]; then
        systemctl start "${UPDATE_TIMER}" || true
    else
        systemctl stop "${UPDATE_TIMER}" >/dev/null 2>&1 || true
    fi

    # Remove failed release only after restoring the old release.
    if [[ -d "${TARGET_RELEASE_DIR}" &&
          "${TARGET_RELEASE_DIR}" != "${PREVIOUS_RELEASE}" ]]; then
        rm -rf -- "${TARGET_RELEASE_DIR}"
    fi

    echo "[ROLLBACK] Recovery procedure finished." >&2
}

on_error() {
    local exit_code=$?
    trap - ERR

    if [[ "${DEPLOYMENT_SUCCEEDED}" -ne 1 ]]; then
        rollback_deployment
    fi

    exit "${exit_code}"
}

trap on_error ERR

# ------------------------------------------------------------------------------
# 1. Create release staging directory
# ------------------------------------------------------------------------------

echo "[1/9] Preparing release directory."

mkdir -p "${TARGET_RELEASE_DIR}"

# Copy backend source.
cp -a "${SOURCE_ROOT}/backend" "${TARGET_RELEASE_DIR}/"

# Remove development-only files and local state.
rm -rf \
    "${TARGET_RELEASE_DIR}/backend/data" \
    "${TARGET_RELEASE_DIR}/backend/.env" \
    "${TARGET_RELEASE_DIR}/backend/.venv" \
    "${TARGET_RELEASE_DIR}/backend/__pycache__"

# Copy frontend source without creating nested frontend/frontend.
mkdir -p "${TARGET_RELEASE_DIR}/frontend"

cp -a "${SOURCE_ROOT}/frontend/." "${TARGET_RELEASE_DIR}/frontend/"

# Copy deployment metadata and other versioned resources.
if [[ -d "${SOURCE_ROOT}/deployment" ]]; then
    cp -a "${SOURCE_ROOT}/deployment" "${TARGET_RELEASE_DIR}/"
fi

# Record target commit.
if [[ -d "${SOURCE_ROOT}/.git" ]]; then

    git -C "${SOURCE_ROOT}" rev-parse HEAD \
        > "${TARGET_RELEASE_DIR}/backend/.git_commit"

elif [[ -f "${SOURCE_ROOT}/backend/.git_commit" ]]; then

    cp -f \
        "${SOURCE_ROOT}/backend/.git_commit" \
        "${TARGET_RELEASE_DIR}/backend/.git_commit"
fi

# ------------------------------------------------------------------------------
# 2. Create Python virtual environment
# ------------------------------------------------------------------------------

echo "[2/9] Building Python environment."

python3 -m venv "${TARGET_RELEASE_DIR}/backend/.venv"

"${TARGET_RELEASE_DIR}/backend/.venv/bin/python" -m pip install \
    --upgrade pip setuptools wheel

"${TARGET_RELEASE_DIR}/backend/.venv/bin/python" -m pip install \
    --no-cache-dir \
    -r "${TARGET_RELEASE_DIR}/backend/requirements.txt"

# ------------------------------------------------------------------------------
# 3. Build or verify frontend
# ------------------------------------------------------------------------------

echo "[3/9] Building frontend."

if [[ -f "${TARGET_RELEASE_DIR}/frontend/dist/index.html" ]]; then

    echo "[INFO] Existing frontend production build found."

else

    if [[ ! -f "${TARGET_RELEASE_DIR}/frontend/package.json" ]]; then
        echo "[ERROR] Frontend package.json is missing." >&2
        exit 1
    fi

    if ! command -v npm >/dev/null 2>&1; then
        echo "[ERROR] npm is required because frontend/dist is missing." >&2
        exit 1
    fi

    if [[ ! -f "${TARGET_RELEASE_DIR}/frontend/package-lock.json" ]]; then
        echo "[ERROR] package-lock.json is required for reproducible npm ci." >&2
        exit 1
    fi

    (
        cd "${TARGET_RELEASE_DIR}/frontend"
        npm ci
        npm run build
    )

fi

if [[ ! -f "${TARGET_RELEASE_DIR}/frontend/dist/index.html" ]]; then
    echo "[ERROR] Frontend production index.html was not generated." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# 4. Stop application services before database backup and migration
# ------------------------------------------------------------------------------

echo "[4/9] Stopping application services."

systemctl stop "${MQTT_SERVICE}"
systemctl stop "${BACKEND_SERVICE}"

# ------------------------------------------------------------------------------
# 5. Mandatory database backup
# ------------------------------------------------------------------------------

echo "[5/9] Creating pre-migration SQLite backup."

if [[ -f "${DB_FILE}" ]]; then

    BACKUP_SCRIPT="${SCRIPT_DIR}/backup-db.sh"

    if [[ ! -f "${BACKUP_SCRIPT}" ]]; then
        echo "[ERROR] backup-db.sh is missing. Cannot safely migrate." >&2
        exit 1
    fi

    BACKUP_FILE="$(
        bash "${BACKUP_SCRIPT}" "${DB_FILE}" "${BACKUPS_DIR}"
    )"

    if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
        echo "[ERROR] SQLite backup was not created." >&2
        exit 1
    fi

    BACKUP_CHECK="$(
        sqlite3 "${BACKUP_FILE}" 'PRAGMA quick_check;' 2>/dev/null
    )"

    if [[ "${BACKUP_CHECK}" != "ok" ]]; then
        echo "[ERROR] SQLite backup integrity check failed." >&2
        exit 1
    fi

    echo "[INFO] Verified backup: ${BACKUP_FILE}"

else

    echo "[INFO] No existing database found. Initial database creation expected."

fi

# ------------------------------------------------------------------------------
# 6. Apply database migrations
# ------------------------------------------------------------------------------

echo "[6/9] Applying Alembic migrations."

MIGRATION_STARTED=1

(
    cd "${TARGET_RELEASE_DIR}/backend"

    # Load production environment variables for Alembic.
    if [[ -f "${ENV_FILE}" ]]; then
        set -a
        # shellcheck source=/dev/null
        source "${ENV_FILE}"
        set +a
    fi

    "${TARGET_RELEASE_DIR}/backend/.venv/bin/alembic" upgrade head
)

echo "[INFO] Database migrations completed."

# ------------------------------------------------------------------------------
# 7. Promote new release atomically
# ------------------------------------------------------------------------------

echo "[7/9] Promoting release."

chown -R veyrasense:veyrasense "${TARGET_RELEASE_DIR}"

TEMP_LINK="${BASE_INSTALL_DIR}/current.next.$$"

rm -f "${TEMP_LINK}"

ln -s "${TARGET_RELEASE_DIR}" "${TEMP_LINK}"
mv -Tf "${TEMP_LINK}" "${CURRENT_LINK}"

RELEASE_PROMOTED=1

if [[ "$(readlink -f "${CURRENT_LINK}")" != "${TARGET_RELEASE_DIR}" ]]; then
    echo "[ERROR] Release symlink verification failed." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# 8. Start services and perform health verification
# ------------------------------------------------------------------------------

echo "[8/9] Starting application services."

systemctl start "${BACKEND_SERVICE}"
systemctl start "${MQTT_SERVICE}"

if ! systemctl is-active --quiet "${BACKEND_SERVICE}"; then
    echo "[ERROR] Backend did not become active." >&2
    exit 1
fi

if ! systemctl is-active --quiet "${MQTT_SERVICE}"; then
    echo "[ERROR] MQTT worker did not become active." >&2
    exit 1
fi

if [[ "${NGINX_WAS_ACTIVE}" -eq 1 ]]; then
    systemctl reload nginx
fi

HEALTH_SCRIPT="${SCRIPT_DIR}/health-check.sh"

if [[ ! -f "${HEALTH_SCRIPT}" ]]; then
    echo "[ERROR] health-check.sh is missing." >&2
    exit 1
fi

bash "${HEALTH_SCRIPT}"

# ------------------------------------------------------------------------------
# 9. Enable services and retain previous releases
# ------------------------------------------------------------------------------

echo "[9/9] Finalizing deployment."

systemctl enable "${BACKEND_SERVICE}"
systemctl enable "${MQTT_SERVICE}"

# Enable timer only after successful deployment.
systemctl enable "${UPDATE_TIMER}"
systemctl start "${UPDATE_TIMER}"

# ------------------------------------------------------------------------------
# Retain active and previous release
# ------------------------------------------------------------------------------

echo "[INFO] Pruning obsolete releases."

mapfile -t ALL_RELEASES < <(
    find "${RELEASES_DIR}" \
        -mindepth 1 \
        -maxdepth 1 \
        -type d \
        -name 'release_*' \
        -printf '%T@ %p\n' |
    sort -nr |
    cut -d' ' -f2-
)

KEPT=0

for RELEASE in "${ALL_RELEASES[@]}"; do

    RESOLVED="$(readlink -f "${RELEASE}" || true)"

    if [[ "${RESOLVED}" == "${TARGET_RELEASE_DIR}" ||
          "${RESOLVED}" == "${PREVIOUS_RELEASE}" ]]; then
        continue
    fi

    KEPT=$((KEPT + 1))

    # Keep one additional recent release besides active and previous.
    if [[ "${KEPT}" -gt 1 ]]; then
        echo "[INFO] Removing obsolete release: ${RELEASE}"
        rm -rf -- "${RELEASE}"
    fi
done

# ------------------------------------------------------------------------------
# Success
# ------------------------------------------------------------------------------

DEPLOYMENT_SUCCEEDED=1
trap - ERR

echo ""
echo "======================================================================"
echo "[DEPLOYMENT-SUCCESS] VeyraSense deployment completed."
echo "Active release: ${RELEASE_TAG}"
echo "Commit: $(cat "${TARGET_RELEASE_DIR}/backend/.git_commit" 2>/dev/null || echo unknown)"
echo "Database backup: ${BACKUP_FILE:-not applicable}"
echo "======================================================================"

exit 0
