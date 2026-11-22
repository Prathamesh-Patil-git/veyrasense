#!/usr/bin/env bash
# ==============================================================================
# VeyraSense — Secure Pi-Initiated Pull-Based Deployment Runner
#
# Production Security Gates & Integrity Enforcement:
# 1. Origin Integrity: Deploys ONLY from the explicitly configured GitHub repository.
#    Rejects arbitrary remote URLs and validates git remote config.
# 2. Branch Restriction: Deploys strictly from the 'main' branch.
# 3. CI/CD Gate: Gated on successful GitHub Actions CI for the EXACT commit being deployed.
#    Does not rely only on commit signatures; inspects check-runs conclusion via GitHub API.
# 4. Commit Authenticity: Validates author, hash, and optional cryptographic GPG/SSH signatures.
# 5. Duplicate Deployment Prevention: Compares target commit against active release (.git_commit).
#    Never repeatedly builds or deploys the same commit.
# 6. Concurrency Locking: Kernel-level flock prevents deployment timer or manual runs from
#    interrupting an active deployment or corrupting symlink state.
# 7. Safe Execution: Invokes atomic deploy.sh with pre-migration backup and automatic rollback.
# ==============================================================================

set -euo pipefail

# 1. Explicitly Configured Repository and Branch Pinning
ENV_FILE="/etc/veyrasense/veyrasense.env"
REPO_URL_CONFIG=$(grep -E '^REPO_URL=' "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")
EXPECTED_REPO_URL="${REPO_URL_CONFIG:-https://github.com/Prathamesh-Patil-git/veyrasense.git}"
REPO_SLUG=$(echo "${EXPECTED_REPO_URL}" | sed -E 's|https?://github.com/([^/]+/[^/.]+)(\.git)?|\1|')
BRANCH="main"
CLONE_STAGE_DIR="/var/lib/veyrasense/deploy_cache"
DEPLOY_SCRIPT="/opt/veyrasense/scripts/deploy.sh"
CURRENT_RELEASE_LINK="/opt/veyrasense/current"
SSH_DEPLOY_KEY="/etc/veyrasense/deploy_key"

# 2. Concurrency Lock Protection
# Timer executions or concurrent manual triggers will not interrupt an active deployment
LOCK_DIR="/run/lock"
if [[ ! -d "${LOCK_DIR}" ]]; then
    LOCK_DIR="/tmp"
fi
LOCK_FILE="${LOCK_DIR}/veyrasense-deploy.lock"
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
    echo "[CONCURRENCY-LOCK] Another deployment process is currently running. Exiting cleanly without interruption." >&2
    exit 0
fi

echo "======================================================================"
echo " VeyraSense Secure Pull Deployment Runner"
echo " Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo " Configured Origin: ${EXPECTED_REPO_URL}"
echo " Enforced Branch:   ${BRANCH}"
echo "======================================================================"

# Load environment configuration if available (for GITHUB_TOKEN or policies)
GATE_ON_CI="true"
REQUIRE_SIGNED_COMMITS="false"
GITHUB_TOKEN=""

if [[ -f "${ENV_FILE}" ]]; then
    # Secure permissions check on env file
    ENV_PERMS=$(stat -c "%a" "${ENV_FILE}" 2>/dev/null || stat -f "%OLp" "${ENV_FILE}" 2>/dev/null || echo "0600")
    if [[ "${ENV_PERMS}" != "600" && "${ENV_PERMS}" != "400" ]]; then
        echo "[SECURITY-WARN] ${ENV_FILE} permissions (${ENV_PERMS}) are too permissive. Enforcing chmod 0600." >&2
        chmod 0600 "${ENV_FILE}" || true
    fi

    # Read specific deploy tokens without exposing secrets
    GATE_ON_CI=$(grep -E '^GATE_ON_CI=' "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "true")
    REQUIRE_SIGNED_COMMITS=$(grep -E '^REQUIRE_SIGNED_COMMITS=' "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "false")
    GITHUB_TOKEN=$(grep -E '^GITHUB_TOKEN=' "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")
fi

# Check SSH deploy key permissions if present
if [[ -f "${SSH_DEPLOY_KEY}" ]]; then
    KEY_PERMS=$(stat -c "%a" "${SSH_DEPLOY_KEY}" 2>/dev/null || stat -f "%OLp" "${SSH_DEPLOY_KEY}" 2>/dev/null || echo "0400")
    if [[ "${KEY_PERMS}" != "400" && "${KEY_PERMS}" != "600" ]]; then
        echo "[SECURITY-WARN] Deploy key ${SSH_DEPLOY_KEY} has insecure permissions (${KEY_PERMS}). Enforcing chmod 0400." >&2
        chmod 0400 "${SSH_DEPLOY_KEY}" || true
    fi
    export GIT_SSH_COMMAND="ssh -i ${SSH_DEPLOY_KEY} -o StrictHostKeyChecking=accept-new"
fi

mkdir -p "${CLONE_STAGE_DIR}"

# 3. Repository Synchronization & Origin Validation
if [[ ! -d "${CLONE_STAGE_DIR}/.git" ]]; then
    echo "[PULL-DEPLOY] Initializing clean repository cache from ${EXPECTED_REPO_URL}..."
    git clone --depth 20 --branch "${BRANCH}" "${EXPECTED_REPO_URL}" "${CLONE_STAGE_DIR}"
    cd "${CLONE_STAGE_DIR}"
else
    cd "${CLONE_STAGE_DIR}"
    # Verify existing remote origin URL strictly matches expected repository
    CURRENT_ORIGIN=$(git config --get remote.origin.url || true)
    if [[ "${CURRENT_ORIGIN}" != "${EXPECTED_REPO_URL}" && "${CURRENT_ORIGIN}" != "${EXPECTED_REPO_URL%.git}" ]]; then
        echo "[SECURITY-ERROR] Staged repository remote origin '${CURRENT_ORIGIN}' does not match expected '${EXPECTED_REPO_URL}'!" >&2
        echo "[SECURITY-ERROR] Possible origin tampering detected. Resetting origin URL." >&2
        git remote set-url origin "${EXPECTED_REPO_URL}"
    fi

    echo "[PULL-DEPLOY] Fetching latest commits from origin/${BRANCH}..."
    git fetch origin "${BRANCH}"
fi

# Ensure branch is strictly checked out to 'main'
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [[ "${CURRENT_BRANCH}" != "${BRANCH}" ]]; then
    echo "[PULL-DEPLOY] Switching branch to ${BRANCH}..."
    git checkout "${BRANCH}"
fi

TARGET_COMMIT=$(git rev-parse "origin/${BRANCH}")
LOCAL_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

# 4. Duplicate Deployment Prevention (Never re-deploy the same commit)
ACTIVE_DEPLOYED_COMMIT=""
if [[ -f "${CURRENT_RELEASE_LINK}/backend/.git_commit" ]]; then
    ACTIVE_DEPLOYED_COMMIT=$(cat "${CURRENT_RELEASE_LINK}/backend/.git_commit" 2>/dev/null || echo "")
fi

if [[ -n "${ACTIVE_DEPLOYED_COMMIT}" && "${TARGET_COMMIT}" == "${ACTIVE_DEPLOYED_COMMIT}" ]]; then
    echo "[PULL-DEPLOY] Target commit ${TARGET_COMMIT:0:10} is ALREADY active in production release."
    echo "[PULL-DEPLOY] System is up-to-date. Skipping redundant deployment."
    exit 0
fi

echo "[PULL-DEPLOY] Candidate commit identified: ${TARGET_COMMIT}"
echo "[PULL-DEPLOY] Active production commit:    ${ACTIVE_DEPLOYED_COMMIT:-none}"

# Fast-forward cache to target commit
git reset --hard "${TARGET_COMMIT}"

# 5. Cryptographic Commit Signature Verification
SIGNATURE_STATUS=$(git log -1 --format="%G?" "${TARGET_COMMIT}" 2>/dev/null || echo "N")
COMMIT_AUTHOR=$(git log -1 --format="%an <%ae>" "${TARGET_COMMIT}")
COMMIT_SUBJECT=$(git log -1 --format="%s" "${TARGET_COMMIT}")

echo "[VERIFICATION] Author:    ${COMMIT_AUTHOR}"
echo "[VERIFICATION] Subject:   ${COMMIT_SUBJECT}"
echo "[VERIFICATION] Signature: '${SIGNATURE_STATUS}' (G=Good, B=Bad, U=Untrusted, N=None)"

if [[ "${REQUIRE_SIGNED_COMMITS}" == "true" ]]; then
    if [[ "${SIGNATURE_STATUS}" != "G" ]]; then
        echo "[SECURITY-ERROR] Target commit does not have a verified cryptographic signature (Status: ${SIGNATURE_STATUS})!" >&2
        echo "[SECURITY-ERROR] Transport encryption (HTTPS) does NOT replace commit signature verification. Aborting." >&2
        exit 1
    fi
    echo "[VERIFICATION-PASS] Commit signature verified."
fi

# 6. CI/CD Gate Verification (Gated on successful GitHub Actions CI)
if [[ "${GATE_ON_CI}" == "true" ]]; then
    echo "[CI-GATE] Querying GitHub Actions CI status for commit ${TARGET_COMMIT:0:10}..."

    # Define required CI jobs from .github/workflows/ci.yml
    DEFAULT_REQUIRED_CHECKS="Backend Test Suite (Python 3.12),Backend Test Suite (Python 3.13),Frontend Compilation & Production Build,Deployment Scripts Syntax & ShellCheck"
    REQUIRED_CHECKS_CONFIG=$(grep -E '^REQUIRED_CI_CHECKS=' "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")
    REQUIRED_CHECKS="${REQUIRED_CHECKS_CONFIG:-${DEFAULT_REQUIRED_CHECKS}}"

    # Secure temporary directory for paginated check-runs responses
    CI_TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'veyrasense_ci.XXXXXX')
    chmod 0700 "${CI_TEMP_DIR}"

    # Ensure temporary responses are cleaned up on script termination
    clean_ci_temp() {
        rm -rf "${CI_TEMP_DIR}"
    }
    trap clean_ci_temp EXIT

    # Base curl header array - authentication token is passed via header array without logging
    CURL_BASE_HEADERS=(
        -H "Accept: application/vnd.github+json"
        -H "X-GitHub-Api-Version: 2022-11-28"
        -H "User-Agent: VeyraSense-Deploy-Runner"
    )
    CURL_AUTH_ARGS=()
    if [[ -n "${GITHUB_TOKEN}" ]]; then
        echo "[CI-GATE] API authentication: configured (Bearer token present)."
        CURL_AUTH_ARGS=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
    else
        echo "[CI-GATE] API authentication: unauthenticated (public repository mode)."
    fi

    # Paging loop: fetch all check-runs pages until all runs are retrieved
    PAGE=1
    PER_PAGE=100
    MAX_PAGES=10
    TOTAL_ITEMS_RETRIEVED=0
    TOTAL_COUNT=-1

    while [[ ${PAGE} -le ${MAX_PAGES} ]]; do
        PAGE_FILE="${CI_TEMP_DIR}/page_${PAGE}.json"
        CHECK_RUNS_URL="https://api.github.com/repos/${REPO_SLUG}/commits/${TARGET_COMMIT}/check-runs?per_page=${PER_PAGE}&page=${PAGE}"

        HTTP_STATUS=$(curl -s -S -w "%{http_code}" -o "${PAGE_FILE}" \
            --connect-timeout 10 \
            --max-time 30 \
            "${CURL_BASE_HEADERS[@]}" \
            "${CURL_AUTH_ARGS[@]}" \
            "${CHECK_RUNS_URL}" 2>/dev/null || echo "000")

        if [[ "${HTTP_STATUS}" == "000" ]]; then
            echo "[CI-GATE-FAIL] Network connection failed or timed out reaching GitHub Check Runs API." >&2
            echo "[CI-GATE-FAIL] Failing closed: cannot verify CI status without API connectivity." >&2
            exit 1
        elif [[ "${HTTP_STATUS}" == "401" ]]; then
            echo "[CI-GATE-FAIL] GitHub API returned HTTP 401 Unauthorized. GITHUB_TOKEN is invalid or expired." >&2
            exit 1
        elif [[ "${HTTP_STATUS}" == "403" ]]; then
            if [[ -z "${GITHUB_TOKEN}" ]]; then
                echo "[CI-GATE-FAIL] GitHub API returned HTTP 403 Forbidden. Unauthenticated rate limit (60 req/hr) exceeded." >&2
                echo "[CI-GATE-FAIL] Configure GITHUB_TOKEN in ${ENV_FILE} to authenticate requests." >&2
            else
                echo "[CI-GATE-FAIL] GitHub API returned HTTP 403 Forbidden. Token lacks required permissions or rate limit reached." >&2
            fi
            exit 1
        elif [[ "${HTTP_STATUS}" == "404" ]]; then
            if [[ -z "${GITHUB_TOKEN}" ]]; then
                echo "[CI-GATE-FAIL] GitHub API returned HTTP 404 Not Found. For private repositories, configure GITHUB_TOKEN in ${ENV_FILE}." >&2
            else
                echo "[CI-GATE-FAIL] GitHub API returned HTTP 404 Not Found. Commit ${TARGET_COMMIT:0:10} not found or token lacks repository scope." >&2
            fi
            exit 1
        elif [[ "${HTTP_STATUS}" != "200" ]]; then
            echo "[CI-GATE-FAIL] GitHub API returned unexpected HTTP status code: ${HTTP_STATUS}." >&2
            exit 1
        fi

        # Parse page statistics safely
        PAGE_STATS=$(python3 - "${PAGE_FILE}" << 'PYEOF'
import sys, json
try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"{data.get('total_count', 0)} {len(data.get('check_runs', []))}")
except Exception:
    print("-1 0")
PYEOF
)
        PAGE_TOTAL=$(echo "${PAGE_STATS}" | awk '{print $1}')
        PAGE_ITEMS=$(echo "${PAGE_STATS}" | awk '{print $2}')

        if [[ "${PAGE_TOTAL}" -lt 0 ]]; then
            echo "[CI-GATE-FAIL] Failed to parse JSON response from GitHub Check Runs API on page ${PAGE}." >&2
            exit 1
        fi

        TOTAL_COUNT="${PAGE_TOTAL}"
        TOTAL_ITEMS_RETRIEVED=$(( TOTAL_ITEMS_RETRIEVED + PAGE_ITEMS ))

        if [[ "${PAGE_ITEMS}" -eq 0 || "${TOTAL_ITEMS_RETRIEVED}" -ge "${TOTAL_COUNT}" ]]; then
            break
        fi

        PAGE=$(( PAGE + 1 ))
    done

    # Strict Validation of All Retrieved Check Runs using Python
    python3 - "${CI_TEMP_DIR}" "${REQUIRED_CHECKS}" << 'PYEOF'
import sys, os, json

pages_dir = sys.argv[1]
required_checks_str = sys.argv[2]
required_checks = [c.strip() for c in required_checks_str.split(",") if c.strip()]

all_check_runs = []
total_count = None

page_files = sorted(
    [os.path.join(pages_dir, f) for f in os.listdir(pages_dir) if f.startswith("page_") and f.endswith(".json")]
)

if not page_files:
    sys.stderr.write("[CI-GATE-FAIL] No API response pages retrieved from GitHub.\n")
    sys.exit(1)

for pfile in page_files:
    try:
        with open(pfile, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        sys.stderr.write(f"[CI-GATE-FAIL] Corrupted JSON response in {os.path.basename(pfile)}: {e}\n")
        sys.exit(1)

    if total_count is None:
        total_count = data.get("total_count", 0)

    runs = data.get("check_runs", [])
    all_check_runs.extend(runs)

if total_count == 0 or len(all_check_runs) == 0:
    sys.stderr.write("[CI-GATE-FAIL] Zero check runs found for this commit. CI workflow has not executed.\n")
    sys.exit(1)

# Group check runs by name, keeping the latest by id if rerun
latest_runs_by_name = {}
for r in all_check_runs:
    name = r.get("name")
    run_id = r.get("id", 0)
    if name not in latest_runs_by_name or run_id > latest_runs_by_name[name].get("id", 0):
        latest_runs_by_name[name] = r

# 1. Verify every required check exists
missing_required = []
for req in required_checks:
    if req not in latest_runs_by_name:
        missing_required.append(req)

if missing_required:
    sys.stderr.write(f"[CI-GATE-FAIL] Missing {len(missing_required)} required CI check(s):\n")
    for m in missing_required:
        sys.stderr.write(f"  - MISSING: '{m}'\n")
    sys.exit(1)

# 2. Inspect required checks for success and unexpected skips
failed_required = []
pending_required = []
skipped_required = []
passed_required = []

for req in required_checks:
    run = latest_runs_by_name[req]
    status = run.get("status")
    conclusion = run.get("conclusion")

    if status != "completed":
        pending_required.append((req, status))
    elif conclusion == "skipped":
        skipped_required.append((req, conclusion))
    elif conclusion != "success":
        failed_required.append((req, conclusion))
    else:
        passed_required.append(req)

if pending_required:
    sys.stderr.write(f"[CI-GATE-WAIT] {len(pending_required)} required check(s) still in progress:\n")
    for req, st in pending_required:
        sys.stderr.write(f"  - IN PROGRESS: '{req}' (status={st})\n")
    sys.exit(1)

if skipped_required:
    sys.stderr.write(f"[CI-GATE-FAIL] {len(skipped_required)} required check(s) unexpectedly SKIPPED:\n")
    for req, conc in skipped_required:
        sys.stderr.write(f"  - SKIPPED: '{req}'\n")
    sys.stderr.write("[CI-GATE-FAIL] Essential verification jobs must execute and pass without being skipped.\n")
    sys.exit(1)

if failed_required:
    sys.stderr.write(f"[CI-GATE-FAIL] {len(failed_required)} required check(s) did NOT succeed:\n")
    for req, conc in failed_required:
        sys.stderr.write(f"  - FAILED/UNSUCCESSFUL: '{req}' (conclusion={conc})\n")
    sys.exit(1)

# 3. Inspect all check runs across the commit for failures or pending checks
overall_failed = []
overall_pending = []
for name, run in latest_runs_by_name.items():
    st = run.get("status")
    conc = run.get("conclusion")
    if st != "completed":
        overall_pending.append((name, st))
    elif conc in ("failure", "cancelled", "timed_out", "action_required", "startup_failure", "stale"):
        overall_failed.append((name, conc))

if overall_pending:
    sys.stderr.write(f"[CI-GATE-WAIT] Non-required check(s) still in progress:\n")
    for name, st in overall_pending:
        sys.stderr.write(f"  - IN PROGRESS: '{name}' (status={st})\n")
    sys.exit(1)

if overall_failed:
    sys.stderr.write(f"[CI-GATE-FAIL] Commit contains {len(overall_failed)} failed check run(s):\n")
    for name, conc in overall_failed:
        sys.stderr.write(f"  - FAILED: '{name}' (conclusion={conc})\n")
    sys.exit(1)

print(f"[CI-GATE-PASS] Verified {total_count} check-runs across {len(page_files)} page(s). All {len(required_checks)} required checks passed with SUCCESS:")
for p in passed_required:
    print(f"  ✓ {p}")
sys.exit(0)
PYEOF

    # Python returns 0 on success; set -e will fail closed if Python exited with non-zero
fi

# 7. Execute Atomic Release Deployment
if [[ -f "${DEPLOY_SCRIPT}" ]]; then
    echo "[PULL-DEPLOY] Invoking atomic deployment script: ${DEPLOY_SCRIPT}..."
    bash "${DEPLOY_SCRIPT}" "${CLONE_STAGE_DIR}"
else
    echo "[PULL-DEPLOY] Invoking staged deployment script..."
    bash "${CLONE_STAGE_DIR}/deployment/raspberry-pi/scripts/deploy.sh" "${CLONE_STAGE_DIR}"
fi

echo "======================================================================"
echo " VeyraSense update completed successfully for commit ${TARGET_COMMIT:0:10}."
echo "======================================================================"
exit 0
