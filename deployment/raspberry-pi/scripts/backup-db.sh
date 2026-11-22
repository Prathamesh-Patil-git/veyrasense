#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Safe SQLite Online Database Backup Script
# Creates a transactionally consistent snapshot of veyrasense.db
# ==============================================================================

set -euo pipefail

DB_PATH="${1:-/var/lib/veyrasense/data/veyrasense.db}"
BACKUP_DIR="${2:-/var/lib/veyrasense/backups}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/veyrasense_${TIMESTAMP}.db.bak"

mkdir -p "${BACKUP_DIR}"

if [[ ! -f "${DB_PATH}" ]]; then
    echo "[BACKUP-INFO] Database file '${DB_PATH}' does not exist yet. No backup needed." >&2
    exit 0
fi

echo "[BACKUP] Creating online SQLite backup..." >&2
echo "[BACKUP] Source: ${DB_PATH}" >&2
echo "[BACKUP] Target: ${BACKUP_FILE}" >&2

# Use SQLite online backup API via CLI to guarantee clean WAL flush and zero locking contention
if sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"; then
    chmod 0640 "${BACKUP_FILE}"
    echo "[BACKUP-SUCCESS] Backup created successfully: ${BACKUP_FILE}" >&2
    
    # Maintain last 10 backup snapshots, prune older
    echo "[BACKUP] Pruning older backups (keeping 10 most recent)..." >&2
    ls -1t "${BACKUP_DIR}"/veyrasense_*.db.bak 2>/dev/null | tail -n +11 | xargs -r rm -f
    
    # Output ONLY the backup file path on stdout for consuming scripts
    echo "${BACKUP_FILE}"
    exit 0
else
    echo "[BACKUP-ERROR] Failed to create database backup from ${DB_PATH}!" >&2
    exit 1
fi
