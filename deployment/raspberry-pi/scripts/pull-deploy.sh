#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Pi-Initiated GitHub Pull Deployment
# Target: Raspberry Pi 5 / Debian 13 ARM64
#
# Features:
# - Pinned GitHub repository and main branch
# - SSH deploy-key authentication
# - GitHub Actions CI gate for the exact commit
# - Complete check-run pagination validation
# - Optional signed-commit enforcement
# - Duplicate deployment prevention
# - One deployment lock shared with deploy.sh
# - Invokes deploy.sh from the exact staged commit
#
# Required environment file:
#   /etc/veyrasense/veyrasense.env
#
# Required settings:
#   REPO_URL=git@github.com:Prathamesh-Patil-git/veyrasense.git
#   GITHUB_TOKEN=...
#   GATE_ON_CI=true
#
# Deploy key:
#   /etc/veyrasense/deploy_key
#
# ==============================================================================

set -Eeuo pipefail
umask 077

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

ENV_FILE="/etc/veyrasense/veyrasense.env"

DEFAULT_REPO_URL="git@github.com:Prathamesh-Patil-git/veyrasense.git"
BRANCH="main"

CLONE_STAGE_DIR="/var/lib/veyrasense/deploy_cache"

CURRENT_RELEASE_LINK="/opt/veyrasense/current"

SSH_DEPLOY_KEY="/etc/veyrasense/deploy_key"

LOCK_FILE="/run/lock/veyrasense-deploy.lock"

MAX_CI_PAGES=10
CI_PER_PAGE=100

# ------------------------------------------------------------------------------
# Root check
# ------------------------------------------------------------------------------

if [[ "${EUID}" -ne 0 ]]; then
    echo "[ERROR] pull-deploy.sh must run as root." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# Read environment values without sourcing the entire environment file
# ------------------------------------------------------------------------------

read_env_value() {
    local key="$1"

    if [[ ! -f "${ENV_FILE}" ]]; then
        return 0
    fi

    local value

    value="$(
        grep -m1 -E "^${key}=" "${ENV_FILE}" 2>/dev/null |
        cut -d '=' -f 2- || true
    )"

    # Remove matching surrounding single or double quotes.
    if [[ "${#value}" -ge 2 ]]; then
        if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]] ||
           [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
            value="${value:1:${#value}-2}"
        fi
    fi

    printf '%s' "${value}"
}

REPO_URL="$(read_env_value REPO_URL)"
REPO_URL="${REPO_URL:-${DEFAULT_REPO_URL}}"

GATE_ON_CI="$(read_env_value GATE_ON_CI)"
GATE_ON_CI="${GATE_ON_CI:-true}"

REQUIRE_SIGNED_COMMITS="$(read_env_value REQUIRE_SIGNED_COMMITS)"
REQUIRE_SIGNED_COMMITS="${REQUIRE_SIGNED_COMMITS:-false}"

GITHUB_TOKEN="$(read_env_value GITHUB_TOKEN)"

REQUIRED_CHECKS="$(read_env_value REQUIRED_CI_CHECKS)"

DEFAULT_REQUIRED_CHECKS="Backend Test Suite (Python 3.12),Backend Test Suite (Python 3.13),Frontend Compilation & Production Build,Deployment Scripts Syntax & ShellCheck"

REQUIRED_CHECKS="${REQUIRED_CHECKS:-${DEFAULT_REQUIRED_CHECKS}}"

# ------------------------------------------------------------------------------
# Validate repository URL and derive GitHub repository slug
# ------------------------------------------------------------------------------

if [[ ! "${REPO_URL}" =~ ^git@github\.com:([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)(\.git)?$ ]]; then
    echo "[ERROR] REPO_URL must use the configured GitHub SSH format." >&2
    echo "[ERROR] Expected: git@github.com:OWNER/REPOSITORY.git" >&2
    echo "[ERROR] Current value: ${REPO_URL}" >&2
    exit 1
fi

REPO_SLUG="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"

# ------------------------------------------------------------------------------
# Validate configuration values
# ------------------------------------------------------------------------------

if [[ "${GATE_ON_CI}" != "true" && "${GATE_ON_CI}" != "false" ]]; then
    echo "[ERROR] GATE_ON_CI must be true or false." >&2
    exit 1
fi

if [[ "${REQUIRE_SIGNED_COMMITS}" != "true" &&
      "${REQUIRE_SIGNED_COMMITS}" != "false" ]]; then
    echo "[ERROR] REQUIRE_SIGNED_COMMITS must be true or false." >&2
    exit 1
fi

if [[ "${GATE_ON_CI}" == "true" && -z "${GITHUB_TOKEN}" ]]; then
    echo "[ERROR] GITHUB_TOKEN is required for the private repository CI gate." >&2
    echo "[ERROR] Configure it in ${ENV_FILE}." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# Required commands
# ------------------------------------------------------------------------------

for cmd in git ssh curl python3 flock stat chmod; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
        echo "[ERROR] Required command not found: ${cmd}" >&2
        exit 1
    fi
done

# ------------------------------------------------------------------------------
# Deploy key
# ------------------------------------------------------------------------------

if [[ ! -f "${SSH_DEPLOY_KEY}" ]]; then
    echo "[ERROR] GitHub deploy key not found: ${SSH_DEPLOY_KEY}" >&2
    echo "[ERROR] Install the Pi's existing deploy key at this path first." >&2
    exit 1
fi

chmod 0400 "${SSH_DEPLOY_KEY}"

export GIT_SSH_COMMAND="ssh -i ${SSH_DEPLOY_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes"

# ------------------------------------------------------------------------------
# Concurrency lock
# ------------------------------------------------------------------------------

mkdir -p "$(dirname "${LOCK_FILE}")"

exec 200>"${LOCK_FILE}"

if ! flock -n 200; then
    echo "[CONCURRENCY-LOCK] Another deployment is already running."
    echo "[CONCURRENCY-LOCK] Skipping this execution."
    exit 0
fi

# ------------------------------------------------------------------------------
# Header
# ------------------------------------------------------------------------------

echo "======================================================================"
echo " VeyraSense Pi-Initiated Pull Deployment"
echo " Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo " Repository: ${REPO_SLUG}"
echo " Branch: ${BRANCH}"
echo " CI gate: ${GATE_ON_CI}"
echo "======================================================================"

# ------------------------------------------------------------------------------
# Prepare staging directory
# ------------------------------------------------------------------------------

install -d -o root -g root -m 0750 \
    /var/lib/veyrasense \
    "${CLONE_STAGE_DIR}"

# ------------------------------------------------------------------------------
# 1. Clone or validate existing repository cache
# ------------------------------------------------------------------------------

if [[ ! -d "${CLONE_STAGE_DIR}/.git" ]]; then

    echo "[PULL] Cloning repository."

    git clone \
        --depth 20 \
        --single-branch \
        --branch "${BRANCH}" \
        "${REPO_URL}" \
        "${CLONE_STAGE_DIR}"

else

    echo "[PULL] Validating existing repository cache."

    CURRENT_ORIGIN="$(
        git -C "${CLONE_STAGE_DIR}" config --get remote.origin.url || true
    )"

    if [[ "${CURRENT_ORIGIN}" != "${REPO_URL}" ]]; then
        echo "[ERROR] Repository cache origin does not match configured origin." >&2
        echo "[ERROR] Expected: ${REPO_URL}" >&2
        echo "[ERROR] Found:    ${CURRENT_ORIGIN}" >&2
        echo "[ERROR] Inspect the cache before changing its remote." >&2
        exit 1
    fi

    echo "[PULL] Fetching origin/${BRANCH}."

    git -C "${CLONE_STAGE_DIR}" fetch \
        --prune \
        --depth 20 \
        origin \
        "${BRANCH}"

fi

# ------------------------------------------------------------------------------
# 2. Resolve exact target commit
# ------------------------------------------------------------------------------

TARGET_COMMIT="$(
    git -C "${CLONE_STAGE_DIR}" rev-parse "origin/${BRANCH}"
)"

if [[ ! "${TARGET_COMMIT}" =~ ^[0-9a-f]{40}$ ]]; then
    echo "[ERROR] Invalid target commit hash." >&2
    exit 1
fi

echo "[PULL] Target commit: ${TARGET_COMMIT}"

# ------------------------------------------------------------------------------
# 3. Check active release for duplicate deployment
# ------------------------------------------------------------------------------

ACTIVE_DEPLOYED_COMMIT=""

if [[ -f "${CURRENT_RELEASE_LINK}/backend/.git_commit" ]]; then
    ACTIVE_DEPLOYED_COMMIT="$(
        cat "${CURRENT_RELEASE_LINK}/backend/.git_commit"
    )"
fi

if [[ "${TARGET_COMMIT}" == "${ACTIVE_DEPLOYED_COMMIT}" ]]; then
    echo "[PULL] Target commit is already active."
    echo "[PULL] No deployment is necessary."
    exit 0
fi

echo "[PULL] Active commit: ${ACTIVE_DEPLOYED_COMMIT:-none}"

# ------------------------------------------------------------------------------
# 4. Checkout exact commit in staging cache
# ------------------------------------------------------------------------------

echo "[PULL] Checking out target commit."

git -C "${CLONE_STAGE_DIR}" checkout \
    --force \
    -B "${BRANCH}" \
    "${TARGET_COMMIT}"

CHECKED_OUT_COMMIT="$(
    git -C "${CLONE_STAGE_DIR}" rev-parse HEAD
)"

if [[ "${CHECKED_OUT_COMMIT}" != "${TARGET_COMMIT}" ]]; then
    echo "[ERROR] Staging checkout does not match target commit." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# 5. Optional signed commit verification
# ------------------------------------------------------------------------------

SIGNATURE_STATUS="$(
    git -C "${CLONE_STAGE_DIR}" log \
        -1 \
        --format="%G?" \
        "${TARGET_COMMIT}" 2>/dev/null || echo "N"
)"

COMMIT_AUTHOR="$(
    git -C "${CLONE_STAGE_DIR}" log \
        -1 \
        --format="%an <%ae>" \
        "${TARGET_COMMIT}"
)"

COMMIT_SUBJECT="$(
    git -C "${CLONE_STAGE_DIR}" log \
        -1 \
        --format="%s" \
        "${TARGET_COMMIT}"
)"

echo "[COMMIT] Author: ${COMMIT_AUTHOR}"
echo "[COMMIT] Subject: ${COMMIT_SUBJECT}"
echo "[COMMIT] Signature status: ${SIGNATURE_STATUS}"

if [[ "${REQUIRE_SIGNED_COMMITS}" == "true" &&
      "${SIGNATURE_STATUS}" != "G" ]]; then
    echo "[ERROR] Commit signature verification failed or is unavailable." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# 6. GitHub Actions CI gate
# ------------------------------------------------------------------------------

if [[ "${GATE_ON_CI}" == "true" ]]; then

    echo "[CI] Checking GitHub Actions results for ${TARGET_COMMIT}."

    CI_TEMP_DIR="$(mktemp -d /tmp/veyrasense-ci.XXXXXX)"
    chmod 0700 "${CI_TEMP_DIR}"

    cleanup_ci() {
        rm -rf "${CI_TEMP_DIR}"
    }

    trap cleanup_ci EXIT

    PAGE=1
    TOTAL_COUNT=-1
    TOTAL_ITEMS=0

    while [[ "${PAGE}" -le "${MAX_CI_PAGES}" ]]; do

        PAGE_FILE="${CI_TEMP_DIR}/page_${PAGE}.json"

        CHECK_RUNS_URL="https://api.github.com/repos/${REPO_SLUG}/commits/${TARGET_COMMIT}/check-runs?per_page=${CI_PER_PAGE}&page=${PAGE}"

        echo "[CI] Retrieving check-runs page ${PAGE}."

        if ! HTTP_STATUS="$(
            curl -sS \
                --connect-timeout 10 \
                --max-time 30 \
                -H "Accept: application/vnd.github+json" \
                -H "X-GitHub-Api-Version: 2022-11-28" \
                -H "User-Agent: VeyraSense-Deploy-Runner" \
                -H "Authorization: Bearer ${GITHUB_TOKEN}" \
                -o "${PAGE_FILE}" \
                -w "%{http_code}" \
                "${CHECK_RUNS_URL}"
        )"; then
            echo "[CI-FAIL] GitHub API connection failed." >&2
            exit 1
        fi

        if [[ "${HTTP_STATUS}" != "200" ]]; then
            echo "[CI-FAIL] GitHub API returned HTTP ${HTTP_STATUS}." >&2
            echo "[CI-FAIL] Verify GITHUB_TOKEN permissions and repository access." >&2
            exit 1
        fi

        PAGE_STATS="$(
            python3 - "${PAGE_FILE}" <<'PYEOF'
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)

    if "total_count" not in data or "check_runs" not in data:
        raise ValueError("Missing expected API response fields")

    print(data["total_count"], len(data["check_runs"]))

except Exception as exc:
    print(f"Invalid GitHub API response: {exc}", file=sys.stderr)
    sys.exit(1)
PYEOF
        )"

        read -r PAGE_TOTAL PAGE_ITEMS <<< "${PAGE_STATS}"

        TOTAL_COUNT="${PAGE_TOTAL}"
        TOTAL_ITEMS=$((TOTAL_ITEMS + PAGE_ITEMS))

        if [[ "${PAGE_ITEMS}" -eq 0 ||
              "${TOTAL_ITEMS}" -ge "${TOTAL_COUNT}" ]]; then
            break
        fi

        PAGE=$((PAGE + 1))
    done

    if [[ "${TOTAL_ITEMS}" -lt "${TOTAL_COUNT}" ]]; then
        echo "[CI-FAIL] Pagination incomplete." >&2
        echo "[CI-FAIL] Retrieved ${TOTAL_ITEMS} of ${TOTAL_COUNT} check runs." >&2
        echo "[CI-FAIL] Increase MAX_CI_PAGES before deployment." >&2
        exit 1
    fi

    # --------------------------------------------------------------------------
    # Verify exact required checks and all check-run conclusions
    # --------------------------------------------------------------------------

    python3 - \
        "${CI_TEMP_DIR}" \
        "${REQUIRED_CHECKS}" \
        "${TOTAL_COUNT}" \
        "${TOTAL_ITEMS}" <<'PYEOF'
import json
import os
import sys

pages_dir = sys.argv[1]
required_checks = [
    item.strip()
    for item in sys.argv[2].split(",")
    if item.strip()
]

expected_total = int(sys.argv[3])
retrieved_total = int(sys.argv[4])

if not required_checks:
    print("[CI-FAIL] No required CI checks are configured.", file=sys.stderr)
    sys.exit(1)

if retrieved_total != expected_total:
    print("[CI-FAIL] Incomplete check-run pagination.", file=sys.stderr)
    sys.exit(1)

page_files = sorted(
    (
        os.path.join(pages_dir, name)
        for name in os.listdir(pages_dir)
        if name.startswith("page_") and name.endswith(".json")
    ),
    key=lambda path: int(os.path.basename(path).split("_")[1].split(".")[0]),
)

all_runs = []

for path in page_files:
    with open(path, encoding="utf-8") as file:
        data = json.load(file)
    all_runs.extend(data.get("check_runs", []))

if not all_runs:
    print("[CI-FAIL] No check runs found for the target commit.", file=sys.stderr)
    sys.exit(1)

# Keep the most recently created run for each check name.
latest = {}

for run in all_runs:
    name = run.get("name")
    if not name:
        continue

    run_id = run.get("id", 0)

    if name not in latest or run_id > latest[name].get("id", 0):
        latest[name] = run

missing = [name for name in required_checks if name not in latest]

if missing:
    print("[CI-FAIL] Required checks are missing:", file=sys.stderr)
    for name in missing:
        print(f"  - {name}", file=sys.stderr)
    sys.exit(1)

required_failures = []

for name in required_checks:
    run = latest[name]

    if run.get("status") != "completed":
        required_failures.append(
            f"{name}: status={run.get('status')}"
        )
    elif run.get("conclusion") != "success":
        required_failures.append(
            f"{name}: conclusion={run.get('conclusion')}"
        )

if required_failures:
    print("[CI-FAIL] Required CI checks did not all succeed:", file=sys.stderr)
    for failure in required_failures:
        print(f"  - {failure}", file=sys.stderr)
    sys.exit(1)

# Reject failed or still-running checks across the target commit.
# Informational checks that completed with neutral or skipped conclusions
# are not automatically treated as failures.
bad_conclusions = {
    "failure",
    "cancelled",
    "timed_out",
    "action_required",
    "startup_failure",
    "stale",
}

other_failures = []

for name, run in latest.items():
    status = run.get("status")
    conclusion = run.get("conclusion")

    if status != "completed":
        other_failures.append(f"{name}: status={status}")
    elif conclusion in bad_conclusions:
        other_failures.append(f"{name}: conclusion={conclusion}")

if other_failures:
    print("[CI-FAIL] Other check runs are pending or unsuccessful:", file=sys.stderr)
    for failure in other_failures:
        print(f"  - {failure}", file=sys.stderr)
    sys.exit(1)

print(
    f"[CI-PASS] Retrieved and verified {retrieved_total} check runs."
)
print(
    f"[CI-PASS] All {len(required_checks)} required checks succeeded:"
)

for name in required_checks:
    print(f"  - {name}")
PYEOF

    echo "[CI] GitHub Actions verification passed."

else

    echo "[CI-WARN] CI gate is disabled in the environment configuration."

fi

# ------------------------------------------------------------------------------
# 7. Validate staged deployment script
# ------------------------------------------------------------------------------

STAGED_DEPLOY_SCRIPT="${CLONE_STAGE_DIR}/deployment/raspberry-pi/scripts/deploy.sh"

if [[ ! -f "${STAGED_DEPLOY_SCRIPT}" ]]; then
    echo "[ERROR] Deployment script is missing from the staged commit." >&2
    exit 1
fi

if ! bash -n "${STAGED_DEPLOY_SCRIPT}"; then
    echo "[ERROR] Staged deployment script failed shell syntax validation." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# 8. Execute deployment
#
# This script already owns the lock. Pass the ownership flag so deploy.sh
# does not attempt to acquire the same lock again.
#
# Use deploy.sh from the staged commit, not an older installed copy.
# ------------------------------------------------------------------------------

echo "[DEPLOY] Starting deployment for commit ${TARGET_COMMIT}."

DEPLOY_LOCK_HELD=1 \
    bash "${STAGED_DEPLOY_SCRIPT}" "${CLONE_STAGE_DIR}"

# ------------------------------------------------------------------------------
# 9. Confirm active release commit
# ------------------------------------------------------------------------------

if [[ ! -f "${CURRENT_RELEASE_LINK}/backend/.git_commit" ]]; then
    echo "[ERROR] Active release commit marker is missing." >&2
    exit 1
fi

ACTIVE_COMMIT="$(
    cat "${CURRENT_RELEASE_LINK}/backend/.git_commit"
)"

if [[ "${ACTIVE_COMMIT}" != "${TARGET_COMMIT}" ]]; then
    echo "[ERROR] Active release commit does not match target commit." >&2
    echo "[ERROR] Target: ${TARGET_COMMIT}" >&2
    echo "[ERROR] Active: ${ACTIVE_COMMIT}" >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# Success
# ------------------------------------------------------------------------------

echo "======================================================================"
echo "[PULL-DEPLOY-SUCCESS] VeyraSense update completed."
echo "Repository: ${REPO_SLUG}"
echo "Branch: ${BRANCH}"
echo "Commit: ${TARGET_COMMIT}"
echo "======================================================================"

exit 0
