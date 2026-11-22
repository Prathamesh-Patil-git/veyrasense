
#!/usr/bin/env bash
# ==============================================================================
# VeyraSense - Mosquitto Coexistence Migration
#
# CARES-RX:   existing listener, port 1883
# VeyraSense: separate listener, port 1884
#
# Debian 13 / Raspberry Pi 5
#
# Run manually:
#   sudo bash migrate-mosquitto-coexistence.sh
#
# This script does not modify CARES-RX application data or its password file.
# ==============================================================================

set -Eeuo pipefail
umask 077

CONF_D="/etc/mosquitto/conf.d"
MAIN_CONF="/etc/mosquitto/mosquitto.conf"
ENV_FILE="/etc/veyrasense/veyrasense.env"
MOSQ_DIR="/var/lib/veyrasense/mosquitto"

VS_USER="veyrasense"
VS_GROUP="mosquitto"

VS_PASSWD="${MOSQ_DIR}/mosquitto_passwd"
VS_ACL="${MOSQ_DIR}/mosquitto.acl"

CARES_PASSWD="/etc/mosquitto/passwd"

BACKUP_ROOT="/var/lib/veyrasense/backups"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="${BACKUP_ROOT}/mosquitto_${TIMESTAMP}"

STAGE_DIR=""
BROKER_PID=""

BACKEND_USER=""
BACKEND_PASS=""
CARES_USER=""
CARES_PASS=""

MIGRATION_STARTED=0
ROLLING_BACK=0
SUCCESS=0

log() {
    printf '[INFO] %s\n' "$*"
}

warn() {
    printf '[WARN] %s\n' "$*" >&2
}

die() {
    printf '[ERROR] %s\n' "$*" >&2
    exit 1
}

cleanup_stage() {
    if [[ -n "${BROKER_PID:-}" ]]; then
        kill "$BROKER_PID" >/dev/null 2>&1 || true
        wait "$BROKER_PID" >/dev/null 2>&1 || true
        BROKER_PID=""
    fi

    if [[ -n "${STAGE_DIR:-}" && -d "$STAGE_DIR" ]]; then
        rm -rf "$STAGE_DIR"
        STAGE_DIR=""
    fi
}

restore_backup() {
    [[ -d "$BACKUP/conf.d" ]] || {
        warn "Configuration backup is missing; automatic restoration is unavailable."
        return 1
    }

    log "Restoring original Mosquitto configuration."

    # Restore the complete original conf.d directory.
    find "$CONF_D" -mindepth 1 -maxdepth 1 \
        -exec rm -rf -- {} +

    cp -a "$BACKUP/conf.d/." "$CONF_D/"

    # Restore the VeyraSense Mosquitto directory exactly as it was.
    if [[ -d "$BACKUP/veyrasense-mosquitto" ]]; then
        find "$MOSQ_DIR" -mindepth 1 -maxdepth 1 \
            -exec rm -rf -- {} +

        cp -a "$BACKUP/veyrasense-mosquitto/." "$MOSQ_DIR/"
    fi

    systemctl restart mosquitto || true

    if systemctl is-active --quiet mosquitto; then
        log "Mosquitto restarted after restoration."
    else
        warn "Mosquitto did not become active after restoration."
    fi
}

rollback() {
    local rc="${1:-1}"

    [[ "$MIGRATION_STARTED" -eq 1 ]] || return "$rc"
    [[ "$ROLLING_BACK" -eq 0 ]] || return "$rc"

    ROLLING_BACK=1
    trap - ERR INT TERM

    printf '\n[ROLLBACK] Migration failed. Restoring original files.\n' >&2

    cleanup_stage
    restore_backup || true

    printf '[ROLLBACK] Backup retained at: %s\n' "$BACKUP" >&2

    exit "$rc"
}

on_error() {
    local rc=$?
    trap - ERR

    if [[ "$MIGRATION_STARTED" -eq 1 ]]; then
        rollback "$rc"
    fi

    exit "$rc"
}

on_signal() {
    if [[ "$MIGRATION_STARTED" -eq 1 ]]; then
        rollback 130
    fi

    cleanup_stage
    exit 130
}

trap cleanup_stage EXIT
trap on_error ERR
trap on_signal INT TERM

# ------------------------------------------------------------------------------
# 1. Prerequisites
# ------------------------------------------------------------------------------

[[ "$EUID" -eq 0 ]] || die "Run this script using sudo."

for cmd in \
    mosquitto \
    mosquitto_passwd \
    python3 \
    ss \
    systemctl \
    grep \
    awk \
    install \
    cp \
    find \
    timeout
do
    command -v "$cmd" >/dev/null 2>&1 ||
        die "Required command not found: $cmd"
done

python3 -c 'import paho.mqtt.client' >/dev/null 2>&1 ||
    die "Paho MQTT is missing. Install python3-paho-mqtt first."

[[ -f "$MAIN_CONF" ]] ||
    die "Missing Mosquitto main configuration: $MAIN_CONF"

[[ -d "$CONF_D" ]] ||
    die "Missing Mosquitto configuration directory: $CONF_D"

[[ -f "$CARES_PASSWD" ]] ||
    die "Existing CARES-RX password file is missing: $CARES_PASSWD"

[[ -f "$ENV_FILE" ]] ||
    die "Missing VeyraSense environment file: $ENV_FILE"

id "$VS_USER" >/dev/null 2>&1 ||
    die "VeyraSense system user does not exist."

getent group "$VS_GROUP" >/dev/null 2>&1 ||
    die "Mosquitto group does not exist."

systemctl is-active --quiet mosquitto ||
    die "Existing Mosquitto service is not active. Resolve that first."

# ------------------------------------------------------------------------------
# 2. Read VeyraSense credentials without sourcing the environment file
# ------------------------------------------------------------------------------

read_env_value() {
    local key="$1"
    local line

    line="$(grep -m1 -E "^[[:space:]]*${key}=" "$ENV_FILE" || true)"
    [[ -n "$line" ]] || return 1

    line="${line#*=}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"

    printf '%s' "$line"
}

BACKEND_USER="$(read_env_value MQTT_BACKEND_USERNAME)" ||
    die "MQTT_BACKEND_USERNAME is missing from the environment file."

BACKEND_PASS="$(read_env_value MQTT_BACKEND_PASSWORD)" ||
    die "MQTT_BACKEND_PASSWORD is missing from the environment file."

[[ "$BACKEND_USER" =~ ^[A-Za-z0-9_.-]{1,64}$ ]] ||
    die "Invalid VeyraSense backend username."

[[ ${#BACKEND_PASS} -ge 16 ]] ||
    die "VeyraSense backend password must contain at least 16 characters."

[[ "$BACKEND_PASS" != *[[:space:]]* ]] ||
    die "VeyraSense backend password must not contain whitespace."

[[ "$BACKEND_PASS" != *$'\n'* && "$BACKEND_PASS" != *$'\r'* ]] ||
    die "VeyraSense backend password must not contain newlines."

# ------------------------------------------------------------------------------
# 3. Obtain one existing CARES-RX credential for coexistence verification
# ------------------------------------------------------------------------------

printf '\n'
printf 'Enter an existing CARES-RX MQTT username for verification: '
IFS= read -r CARES_USER

[[ -n "$CARES_USER" ]] ||
    die "CARES-RX username cannot be empty."

printf 'Enter its MQTT password: '
IFS= read -r -s CARES_PASS
printf '\n'

[[ -n "$CARES_PASS" ]] ||
    die "CARES-RX password cannot be empty."

# ------------------------------------------------------------------------------
# 4. Check listener configuration conflicts
# ------------------------------------------------------------------------------

if grep -R -nE \
    '^[[:space:]]*listener[[:space:]]+1884([[:space:]]|$)' \
    "$CONF_D" \
    --include='*.conf' |
    grep -vE '/(veyrasense\.conf|99-veyrasense\.conf):'; then

    die "Another active Mosquitto configuration already defines port 1884."
fi

# Confirm that the existing configuration defines the CARES-RX listener.
if ! grep -R -qE \
    '^[[:space:]]*listener[[:space:]]+1883([[:space:]]|$)' \
    "$CONF_D" \
    --include='*.conf'; then

    die "Could not find the existing CARES-RX listener on port 1883."
fi

# ------------------------------------------------------------------------------
# 5. Prepare temporary files and hash the VeyraSense backend password
# ------------------------------------------------------------------------------

STAGE_DIR="$(mktemp -d /tmp/veyrasense-mosquitto.XXXXXX)"
chmod 0700 "$STAGE_DIR"

TMP_PW="${STAGE_DIR}/password"
TMP_ACL="${STAGE_DIR}/acl"
TMP_MERGE="${STAGE_DIR}/password-merged"

printf '%s:%s\n' "$BACKEND_USER" "$BACKEND_PASS" > "$TMP_PW"
chmod 0600 "$TMP_PW"

# Mosquitto hashes the password file in place.
# The plaintext password is not supplied as a command-line argument.
mosquitto_passwd -U "$TMP_PW" >/dev/null

grep -Fq "${BACKEND_USER}:\$7\$" "$TMP_PW" ||
    die "Mosquitto did not generate the expected password hash."

# ------------------------------------------------------------------------------
# 6. Prepare VeyraSense password file without changing the live file yet
# ------------------------------------------------------------------------------

if [[ -f "$VS_PASSWD" ]]; then
    grep -v -F "${BACKEND_USER}:" "$VS_PASSWD" > "$TMP_MERGE" || true
else
    : > "$TMP_MERGE"
fi

cat "$TMP_PW" >> "$TMP_MERGE"
chmod 0600 "$TMP_MERGE"

# ------------------------------------------------------------------------------
# 7. Prepare VeyraSense ACL
# ------------------------------------------------------------------------------

if [[ -f "$VS_ACL" ]]; then
    cp "$VS_ACL" "$TMP_ACL"
else
    : > "$TMP_ACL"
fi

# Remove the old backend user's entire ACL block, then rebuild it.
# Also remove all CARES-RX topic and pattern grants from this ACL.
#
# Other VeyraSense users and their non-CARES-RX rules are preserved.

TMP_ACL_CLEAN="${STAGE_DIR}/acl-clean"

awk -v backend_user="$BACKEND_USER" '
    BEGIN {
        skip_backend = 0
    }

    /^[[:space:]]*user[[:space:]]+/ {
        current_user = $0
        sub(/^[[:space:]]*user[[:space:]]+/, "", current_user)

        skip_backend = (current_user == backend_user)

        if (!skip_backend) {
            print
        }
        next
    }

    skip_backend {
        next
    }

    /^[[:space:]]*(topic|pattern)[[:space:]]+(read|write|readwrite)[[:space:]]+(cares|caresrx)(\/|[[:space:]]|$)/ {
        next
    }

    {
        print
    }
' "$TMP_ACL" > "$TMP_ACL_CLEAN"

cat >> "$TMP_ACL_CLEAN" <<EOF

# VeyraSense backend service
user ${BACKEND_USER}
topic read veyrasense/nodes/+/telemetry
topic readwrite veyrasense/nodes/+/status
topic write veyrasense/nodes/+/commands
EOF

mv "$TMP_ACL_CLEAN" "$TMP_ACL"
chmod 0600 "$TMP_ACL"

# ------------------------------------------------------------------------------
# 8. Create a backup before modifying production files
# ------------------------------------------------------------------------------

mkdir -p "$BACKUP_ROOT" "$MOSQ_DIR" "$CONF_D"
mkdir -p "$BACKUP"

cp -a "$CONF_D" "$BACKUP/conf.d"

mkdir -p "$BACKUP/veyrasense-mosquitto"

if [[ -d "$MOSQ_DIR" ]]; then
    cp -a "$MOSQ_DIR/." "$BACKUP/veyrasense-mosquitto/"
fi

log "Original configuration backed up at $BACKUP"

# ------------------------------------------------------------------------------
# 9. Validate a staged Mosquitto configuration
# ------------------------------------------------------------------------------

STAGE_CONF="${STAGE_DIR}/mosquitto.conf"
STAGE_LOG="${STAGE_DIR}/mosquitto.log"

cat > "$STAGE_CONF" <<EOF
per_listener_settings true

persistence false

listener 21883 127.0.0.1
allow_anonymous false
password_file ${CARES_PASSWD}

listener 21884 127.0.0.1
allow_anonymous false
password_file ${TMP_MERGE}
acl_file ${TMP_ACL}
EOF

chmod 0600 "$STAGE_CONF"

log "Starting isolated validation broker."

mosquitto -c "$STAGE_CONF" -v > "$STAGE_LOG" 2>&1 &
BROKER_PID=$!

stage_ready=0

for attempt in $(seq 1 50); do
    if ss -ltn | awk '{print $4}' | grep -qE '(:|\])21883$' &&
       ss -ltn | awk '{print $4}' | grep -qE '(:|\])21884$'; then
        stage_ready=1
        break
    fi

    if ! kill -0 "$BROKER_PID" 2>/dev/null; then
        cat "$STAGE_LOG" >&2
        die "Staged Mosquitto configuration failed to start."
    fi

    sleep 0.2
done

[[ "$stage_ready" -eq 1 ]] ||
    die "Staged Mosquitto listeners did not become ready."

# ------------------------------------------------------------------------------
# 10. MQTT authentication test helper
# ------------------------------------------------------------------------------

mqtt_auth_test() {
    local port="$1"
    local expected="$2"
    local username="$3"
    local password="$4"

    python3 - "$port" "$expected" 3<<<"${username}"$'\n'"${password}" <<'PY'
import sys
import time
import paho.mqtt.client as mqtt

port = int(sys.argv[1])
expected = sys.argv[2] == "accept"

with open("/dev/fd/3", "r", encoding="utf-8") as handle:
    username = handle.readline().rstrip("\n")
    password = handle.readline().rstrip("\n")

result = {"code": None}

kwargs = {
    "client_id": "veyrasense-migration-check",
    "protocol": mqtt.MQTTv311,
}

if hasattr(mqtt, "CallbackAPIVersion"):
    kwargs["callback_api_version"] = mqtt.CallbackAPIVersion.VERSION1

client = mqtt.Client(**kwargs)
client.username_pw_set(username, password)

def on_connect(client, userdata, flags, rc, *args):
    result["code"] = rc

client.on_connect = on_connect

try:
    client.connect("127.0.0.1", port, keepalive=5)
    client.loop_start()

    deadline = time.monotonic() + 5

    while result["code"] is None and time.monotonic() < deadline:
        time.sleep(0.05)

    client.loop_stop()
    client.disconnect()

except Exception:
    result["code"] = -1

accepted = result["code"] == 0

if accepted != expected:
    sys.exit(1)

sys.exit(0)
PY
}

# Test both credential sets against both staged listeners.
log "Testing VeyraSense credentials on staged port 21884."

mqtt_auth_test 21884 accept "$BACKEND_USER" "$BACKEND_PASS" ||
    die "VeyraSense credentials failed staged authentication."

log "Testing VeyraSense credentials are rejected on staged port 21883."

mqtt_auth_test 21883 reject "$BACKEND_USER" "$BACKEND_PASS" ||
    die "VeyraSense credentials were accepted by the CARES-RX listener."

log "Testing CARES-RX credentials on staged port 21883."

mqtt_auth_test 21883 accept "$CARES_USER" "$CARES_PASS" ||
    die "CARES-RX credentials failed staged authentication."

log "Testing CARES-RX credentials are rejected on staged port 21884."

mqtt_auth_test 21884 reject "$CARES_USER" "$CARES_PASS" ||
    die "CARES-RX credentials were accepted by the VeyraSense listener."

cleanup_stage

log "Staged configuration and credential tests passed."

# ------------------------------------------------------------------------------
# 11. Apply production configuration
# ------------------------------------------------------------------------------

MIGRATION_STARTED=1

install -o "$VS_USER" -g "$VS_GROUP" -m 0660 \
    "$TMP_MERGE" "$VS_PASSWD"

install -o "$VS_USER" -g "$VS_GROUP" -m 0660 \
    "$TMP_ACL" "$VS_ACL"

chown "$VS_USER:$VS_GROUP" "$MOSQ_DIR"
chmod 2770 "$MOSQ_DIR"

# Enable per-listener authentication before listener configuration is loaded.
cat > "${CONF_D}/00-coexistence.conf" <<'EOF'
# Independent authentication and ACL configuration per listener.
per_listener_settings true
EOF

chmod 0644 "${CONF_D}/00-coexistence.conf"

# VeyraSense listener. CARES-RX configuration is not edited.
cat > "${CONF_D}/veyrasense.conf" <<'EOF'
# VeyraSense MQTT listener
listener 1884 0.0.0.0
allow_anonymous false
password_file /var/lib/veyrasense/mosquitto/mosquitto_passwd
acl_file /var/lib/veyrasense/mosquitto/mosquitto.acl
EOF

chmod 0644 "${CONF_D}/veyrasense.conf"

# Disable the old VeyraSense drop-in if it exists.
# The original is already preserved in the backup.
if [[ -f "${CONF_D}/99-veyrasense.conf" ]]; then
    mv "${CONF_D}/99-veyrasense.conf" \
       "${CONF_D}/99-veyrasense.conf.disabled"
fi

# ------------------------------------------------------------------------------
# 12. Restart production Mosquitto
# ------------------------------------------------------------------------------

log "Restarting Mosquitto with both listeners."

systemctl restart mosquitto

systemctl is-active --quiet mosquitto ||
    die "Mosquitto failed to become active."

for port in 1883 1884; do
    listening=0

    for attempt in $(seq 1 25); do
        if ss -ltn | awk '{print $4}' |
            grep -qE "(:|\\])${port}$"; then
            listening=1
            break
        fi

        sleep 0.2
    done

    [[ "$listening" -eq 1 ]] ||
        die "Expected listener port ${port} is not listening."
done

# ------------------------------------------------------------------------------
# 13. Verify production authentication
# ------------------------------------------------------------------------------

log "Testing VeyraSense credentials on production port 1884."

mqtt_auth_test 1884 accept "$BACKEND_USER" "$BACKEND_PASS" ||
    die "VeyraSense authentication failed on port 1884."

log "Testing VeyraSense credentials are rejected on port 1883."

mqtt_auth_test 1883 reject "$BACKEND_USER" "$BACKEND_PASS" ||
    die "VeyraSense credentials were accepted on CARES-RX port 1883."

log "Testing CARES-RX credentials on production port 1883."

mqtt_auth_test 1883 accept "$CARES_USER" "$CARES_PASS" ||
    die "CARES-RX authentication failed on port 1883."

log "Testing CARES-RX credentials are rejected on port 1884."

mqtt_auth_test 1884 reject "$CARES_USER" "$CARES_PASS" ||
    die "CARES-RX credentials were accepted on VeyraSense port 1884."

# ------------------------------------------------------------------------------
# 14. Complete
# ------------------------------------------------------------------------------

unset BACKEND_PASS CARES_PASS

SUCCESS=1
MIGRATION_STARTED=0

trap - ERR INT TERM

printf '\n'
printf '============================================================\n'
printf ' Mosquitto coexistence migration completed successfully.\n'
printf '============================================================\n'
printf ' CARES-RX listener:       1883\n'
printf ' VeyraSense listener:     1884\n'
printf ' Separate password files: yes\n'
printf ' Separate ACL files:      yes\n'
printf ' CARES-RX credentials:    verified on 1883\n'
printf ' VeyraSense credentials:  verified on 1884\n'
printf ' Cross-listener rejection: verified\n'
printf ' Backup:                  %s\n' "$BACKUP"
printf '============================================================\n'
