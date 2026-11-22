
#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Safe SQLite Online Database Backup
# Target: Raspberry Pi 5 / Debian 13
#
# Features:
# - SQLite online backup API
# - WAL-consistent snapshots
# - Temporary backup followed by atomic rename
# - Backup integrity verification
# - Retains the 10 most recent successful backups
# - Prints only the final backup path to stdout
#
# Usage:
#   sudo bash backup-db.sh [DATABASE_PATH] [BACKUP_DIRECTORY]
# ==============================================================================

set -Eeuo pipefail
umask 027

DB_PATH="${1:-/var/lib/veyrasense/data/veyrasense.db}"
BACKUP_DIR="${2:-/var/lib/veyrasense/backups}"

TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"

BACKUP_FILE="${BACKUP_DIR}/veyrasense_${TIMESTAMP}.db.bak"
TEMP_FILE="${BACKUP_FILE}.tmp"

log() {
    echo "[BACKUP] $*" >&2
}

die() {
    echo "[BACKUP-ERROR] $*" >&2
    exit 1
}

# Remove incomplete temporary backup on exit.
trap 'rm -f -- "${TEMP_FILE}"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# ------------------------------------------------------------------------------
# 1. Validate prerequisites
# ------------------------------------------------------------------------------

command -v sqlite3 >/dev/null 2>&1 ||
    die "sqlite3 is not installed."

command -v chmod >/dev/null 2>&1 ||
    die "chmod is unavailable."

command -v mv >/dev/null 2>&1 ||
    die "mv is unavailable."

[[ -f "${DB_PATH}" ]] || {
    log "Database does not exist yet: ${DB_PATH}"
    exit 0
}

[[ -r "${DB_PATH}" ]] ||
    die "Database is not readable: ${DB_PATH}"

# ------------------------------------------------------------------------------
# 2. Prepare backup directory
# ------------------------------------------------------------------------------

mkdir -p "${BACKUP_DIR}"

[[ -d "${BACKUP_DIR}" && -w "${BACKUP_DIR}" ]] ||
    die "Backup directory is not writable: ${BACKUP_DIR}"

if [[ -e "${BACKUP_FILE}" || -e "${TEMP_FILE}" ]]; then
    die "Backup filename collision. Check the backup directory."
fi

log "Starting SQLite online backup."
log "Source: ${DB_PATH}"
log "Temporary destination: ${TEMP_FILE}"

# ------------------------------------------------------------------------------
# 3. Create consistent SQLite backup
# ------------------------------------------------------------------------------

if ! sqlite3 "${DB_PATH}" ".backup '${TEMP_FILE}'"; then
    die "SQLite online backup operation failed."
fi

[[ -s "${TEMP_FILE}" ]] ||
    die "Backup file is empty or was not created."

# ------------------------------------------------------------------------------
# 4. Verify completed backup
# ------------------------------------------------------------------------------

log "Checking backup database integrity."

INTEGRITY_RESULT="$(sqlite3 "${TEMP_FILE}" 'PRAGMA integrity_check;' 2>&1)" ||
    die "Unable to execute integrity_check on the backup."

[[ "${INTEGRITY_RESULT}" == "ok" ]] ||
    die "Backup integrity check failed: ${INTEGRITY_RESULT}"

log "Backup integrity verified."

# ------------------------------------------------------------------------------
# 5. Apply permissions and atomically publish backup
# ------------------------------------------------------------------------------

chmod 0640 "${TEMP_FILE}"

mv "${TEMP_FILE}" "${BACKUP_FILE}"

[[ -s "${BACKUP_FILE}" ]] ||
    die "Final backup file is missing or empty."

log "Backup created successfully: ${BACKUP_FILE}"

# ------------------------------------------------------------------------------
# 6. Retain latest 10 successful backups
# ------------------------------------------------------------------------------

log "Pruning old backups; retaining 10 most recent."

mapfile -t BACKUP_LIST < <(
    find "${BACKUP_DIR}" \
        -maxdepth 1 \
        -type f \
        -name 'veyrasense_*.db.bak' \
        -printf '%T@ %p\n' |
        sort -rn |
        awk '{ $1=""; sub(/^ /,""); print }'
)

COUNT=0

for backup in "${BACKUP_LIST[@]}"; do
    COUNT=$((COUNT + 1))

    if [[ "${COUNT}" -gt 10 ]]; then
        rm -f -- "${backup}"
        log "Removed old backup: ${backup}"
    fi
done

# ------------------------------------------------------------------------------
# 7. Return backup path for deployment script
# ------------------------------------------------------------------------------

echo "${BACKUP_FILE}"

exit 0
