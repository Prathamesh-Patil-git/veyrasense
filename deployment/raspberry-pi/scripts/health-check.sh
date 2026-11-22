#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Edge Gateway Health Check
# Target: Raspberry Pi 5 / Debian 13
#
# Checks:
# - Backend systemd service
# - FastAPI direct health endpoint
# - Nginx service
# - Nginx reverse-proxy health endpoint
# - Frontend delivery
# - MQTT worker systemd service
# - SQLite database availability and integrity
#
# Exit:
#   0 = All required checks passed
#   1 = One or more required checks failed
#
# Usage:
#   sudo bash health-check.sh
#   sudo bash health-check.sh BACKEND_URL NGINX_API_URL FRONTEND_URL
# ==============================================================================

set -Eeuo pipefail

BACKEND_URL="${1:-http://127.0.0.1:8000/api/v1/health}"
NGINX_URL="${2:-http://127.0.0.1/api/v1/health}"
FRONTEND_URL="${3:-http://127.0.0.1/}"

DB_FILE="/var/lib/veyrasense/data/veyrasense.db"

BACKEND_SERVICE="veyrasense-backend.service"
MQTT_SERVICE="veyrasense-mqtt-worker.service"

MAX_RETRIES=15
RETRY_INTERVAL=2
CURL_TIMEOUT=3

FAILED=0

log() {
    echo "[HEALTH] $*"
}

pass() {
    echo "[HEALTH-PASS] $*"
}

fail() {
    echo "[HEALTH-FAIL] $*" >&2
    FAILED=1
}

# ------------------------------------------------------------------------------
# 1. Verify required commands
# ------------------------------------------------------------------------------

for cmd in curl systemctl sqlite3; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        fail "Required command is unavailable: ${cmd}"
    fi
done

if [[ "$FAILED" -ne 0 ]]; then
    exit 1
fi

log "Starting VeyraSense gateway health checks."

# ------------------------------------------------------------------------------
# 2. Check backend systemd service
# ------------------------------------------------------------------------------

if systemctl is-active --quiet "$BACKEND_SERVICE"; then
    pass "Backend systemd service is active."
else
    fail "Backend systemd service is not active."
fi

# ------------------------------------------------------------------------------
# 3. Check FastAPI direct health endpoint
# ------------------------------------------------------------------------------

log "Checking backend API: ${BACKEND_URL}"

BACKEND_SUCCESS=0

for ((i=1; i<=MAX_RETRIES; i++)); do

    HTTP_CODE="$(
        curl -sS \
            -o /dev/null \
            -w "%{http_code}" \
            --connect-timeout "$CURL_TIMEOUT" \
            --max-time 5 \
            "$BACKEND_URL" 2>/dev/null || true
    )"

    if [[ "$HTTP_CODE" == "200" ]]; then
        pass "Backend API returned HTTP 200 (attempt ${i}/${MAX_RETRIES})."
        BACKEND_SUCCESS=1
        break
    fi

    log "Backend not ready yet (attempt ${i}/${MAX_RETRIES}, HTTP ${HTTP_CODE:-no response})."
    sleep "$RETRY_INTERVAL"
done

if [[ "$BACKEND_SUCCESS" -ne 1 ]]; then
    fail "Backend did not return HTTP 200."
fi

# ------------------------------------------------------------------------------
# 4. Check MQTT worker service
# ------------------------------------------------------------------------------

if systemctl is-active --quiet "$MQTT_SERVICE"; then
    pass "MQTT worker systemd service is active."
else
    fail "MQTT worker systemd service is not active."
fi

# ------------------------------------------------------------------------------
# 5. Check SQLite database
# ------------------------------------------------------------------------------

log "Checking SQLite database."

if [[ ! -f "$DB_FILE" ]]; then
    fail "Database file does not exist: ${DB_FILE}"
else

    if [[ ! -r "$DB_FILE" ]]; then
        fail "Database file is not readable."
    else

        DB_CHECK="$(
            sqlite3 "$DB_FILE" 'PRAGMA quick_check;' 2>/dev/null || true
        )"

        if [[ "$DB_CHECK" == "ok" ]]; then
            pass "SQLite database is accessible and quick_check passed."
        else
            fail "SQLite database quick_check failed: ${DB_CHECK:-no result}"
        fi
    fi
fi

# ------------------------------------------------------------------------------
# 6. Check Nginx service
# ------------------------------------------------------------------------------

if systemctl is-active --quiet nginx; then
    pass "Nginx service is active."
else
    fail "Nginx service is not active."
fi

# ------------------------------------------------------------------------------
# 7. Check Nginx reverse proxy
# ------------------------------------------------------------------------------

log "Checking Nginx API route: ${NGINX_URL}"

NGINX_SUCCESS=0

for ((i=1; i<=MAX_RETRIES; i++)); do

    NGINX_CODE="$(
        curl -sS \
            -o /dev/null \
            -w "%{http_code}" \
            --connect-timeout "$CURL_TIMEOUT" \
            --max-time 5 \
            "$NGINX_URL" 2>/dev/null || true
    )"

    if [[ "$NGINX_CODE" == "200" ]]; then
        pass "Nginx API reverse proxy returned HTTP 200."
        NGINX_SUCCESS=1
        break
    fi

    log "Waiting for Nginx API route (attempt ${i}/${MAX_RETRIES}, HTTP ${NGINX_CODE:-no response})."
    sleep "$RETRY_INTERVAL"
done

if [[ "$NGINX_SUCCESS" -ne 1 ]]; then
    fail "Nginx API reverse proxy did not return HTTP 200."
fi

# ------------------------------------------------------------------------------
# 8. Check frontend delivery
# ------------------------------------------------------------------------------

log "Checking frontend: ${FRONTEND_URL}"

FRONTEND_CODE="$(
    curl -sS \
        -o /dev/null \
        -w "%{http_code}" \
        --connect-timeout "$CURL_TIMEOUT" \
        --max-time 5 \
        "$FRONTEND_URL" 2>/dev/null || true
)"

if [[ "$FRONTEND_CODE" == "200" ]]; then
    pass "Frontend returned HTTP 200."
else
    fail "Frontend did not return HTTP 200 (status: ${FRONTEND_CODE:-no response})."
fi

# ------------------------------------------------------------------------------
# 9. Final result
# ------------------------------------------------------------------------------

echo ""
echo "======================================================================"

if [[ "$FAILED" -eq 0 ]]; then
    echo "[HEALTH-SUCCESS] All required VeyraSense health checks passed."
    echo "======================================================================"
    exit 0
else
    echo "[HEALTH-FAIL] One or more VeyraSense health checks failed."
    echo "[ACTION] Deployment should be rolled back."
    echo "======================================================================"
    exit 1
fi
