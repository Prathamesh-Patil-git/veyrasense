#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Edge Gateway Health Check & Verification Script
# Probes local FastAPI /api/v1/health and Nginx reverse proxy
# ==============================================================================

set -euo pipefail

BACKEND_URL="${1:-http://127.0.0.1:8000/api/v1/health}"
NGINX_URL="${2:-http://127.0.0.1/api/v1/health}"
MAX_RETRIES=15
RETRY_INTERVAL=1

echo "[HEALTH] Checking VeyraSense Edge Gateway health..."

# 1. Probe Backend Direct Loopback
SUCCESS=0
for ((i=1; i<=MAX_RETRIES; i++)); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "${BACKEND_URL}" || true)
    if [[ "${HTTP_CODE}" == "200" ]]; then
        echo "[HEALTH-PASS] Backend API is responsive (HTTP 200) on attempt $i."
        SUCCESS=1
        break
    else
        echo "[HEALTH-WAIT] Waiting for backend at ${BACKEND_URL}... (Attempt $i/$MAX_RETRIES, status: ${HTTP_CODE})"
        sleep "${RETRY_INTERVAL}"
    fi
done

if [[ "${SUCCESS}" -ne 1 ]]; then
    echo "[HEALTH-FAIL] Backend failed to return HTTP 200 within ${MAX_RETRIES} seconds." >&2
    exit 1
fi

# 2. Probe Nginx Reverse Proxy Route if Nginx is active
if systemctl is-active --quiet nginx 2>/dev/null; then
    NGINX_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "${NGINX_URL}" || true)
    if [[ "${NGINX_CODE}" == "200" ]]; then
        echo "[HEALTH-PASS] Nginx reverse proxy is correctly routing to backend (HTTP 200)."
    else
        echo "[HEALTH-WARN] Nginx returned status ${NGINX_CODE} for ${NGINX_URL}. Please check Nginx configuration."
    fi
fi

echo "[HEALTH-SUCCESS] All primary gateway health checks passed."
exit 0
