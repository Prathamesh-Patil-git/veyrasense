"""
VeyraSense — Automated Tests for GitHub CI Gate Verification
Tests pagination, required check enforcement, skip rejection, and fail-closed logic.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

REQUIRED_CHECKS = (
    "Backend Test Suite (Python 3.12),"
    "Backend Test Suite (Python 3.13),"
    "Frontend Compilation & Production Build,"
    "Deployment Scripts Syntax & ShellCheck"
)

VALIDATOR_CODE = """
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
    sys.stderr.write("[CI-GATE-FAIL] No API response pages retrieved from GitHub.\\n")
    sys.exit(1)

for pfile in page_files:
    try:
        with open(pfile, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        sys.stderr.write(f"[CI-GATE-FAIL] Corrupted JSON response in {os.path.basename(pfile)}: {e}\\n")
        sys.exit(1)

    if total_count is None:
        total_count = data.get("total_count", 0)

    runs = data.get("check_runs", [])
    all_check_runs.extend(runs)

if total_count == 0 or len(all_check_runs) == 0:
    sys.stderr.write("[CI-GATE-FAIL] Zero check runs found for this commit. CI workflow has not executed.\\n")
    sys.exit(1)

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
    sys.stderr.write(f"[CI-GATE-FAIL] Missing {len(missing_required)} required CI check(s):\\n")
    for m in missing_required:
        sys.stderr.write(f"  - MISSING: '{m}'\\n")
    sys.exit(1)

# 2. Inspect required checks
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
    sys.stderr.write(f"[CI-GATE-WAIT] {len(pending_required)} required check(s) still in progress:\\n")
    for req, st in pending_required:
        sys.stderr.write(f"  - IN PROGRESS: '{req}' (status={st})\\n")
    sys.exit(1)

if skipped_required:
    sys.stderr.write(f"[CI-GATE-FAIL] {len(skipped_required)} required check(s) unexpectedly SKIPPED:\\n")
    for req, conc in skipped_required:
        sys.stderr.write(f"  - SKIPPED: '{req}'\\n")
    sys.stderr.write("[CI-GATE-FAIL] Essential verification jobs must execute and pass without being skipped.\\n")
    sys.exit(1)

if failed_required:
    sys.stderr.write(f"[CI-GATE-FAIL] {len(failed_required)} required check(s) did NOT succeed:\\n")
    for req, conc in failed_required:
        sys.stderr.write(f"  - FAILED/UNSUCCESSFUL: '{req}' (conclusion={conc})\\n")
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
    sys.stderr.write(f"[CI-GATE-WAIT] Non-required check(s) still in progress:\\n")
    for name, st in overall_pending:
        sys.stderr.write(f"  - IN PROGRESS: '{name}' (status={st})\\n")
    sys.exit(1)

if overall_failed:
    sys.stderr.write(f"[CI-GATE-FAIL] Commit contains {len(overall_failed)} failed check run(s):\\n")
    for name, conc in overall_failed:
        sys.stderr.write(f"  - FAILED: '{name}' (conclusion={conc})\\n")
    sys.exit(1)

print(f"[CI-GATE-PASS] Verified {total_count} check-runs across {len(page_files)} page(s). All {len(required_checks)} required checks passed with SUCCESS:")
for p in passed_required:
    print(f"  ✓ {p}")
sys.exit(0)
"""


def run_validator(pages_dir: Path, required_checks: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-c", VALIDATOR_CODE, str(pages_dir), required_checks],
        capture_output=True,
        text=True,
    )


def test_ci_gate_all_passed():
    """All 4 required checks completed with success -> PASS (exit 0)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        page1 = {
            "total_count": 4,
            "check_runs": [
                {"id": 1, "name": "Backend Test Suite (Python 3.12)", "status": "completed", "conclusion": "success"},
                {"id": 2, "name": "Backend Test Suite (Python 3.13)", "status": "completed", "conclusion": "success"},
                {"id": 3, "name": "Frontend Compilation & Production Build", "status": "completed", "conclusion": "success"},
                {"id": 4, "name": "Deployment Scripts Syntax & ShellCheck", "status": "completed", "conclusion": "success"},
            ],
        }
        with open(tmp_path / "page_1.json", "w", encoding="utf-8") as f:
            json.dump(page1, f)

        res = run_validator(tmp_path, REQUIRED_CHECKS)
        assert res.returncode == 0
        assert "[CI-GATE-PASS]" in res.stdout
        assert "All 4 required checks passed" in res.stdout


def test_ci_gate_missing_required_check():
    """One of the 4 required checks is missing -> REJECT (exit 1)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        page1 = {
            "total_count": 3,
            "check_runs": [
                {"id": 1, "name": "Backend Test Suite (Python 3.12)", "status": "completed", "conclusion": "success"},
                {"id": 2, "name": "Backend Test Suite (Python 3.13)", "status": "completed", "conclusion": "success"},
                {"id": 3, "name": "Frontend Compilation & Production Build", "status": "completed", "conclusion": "success"},
                # Missing: Deployment Scripts Syntax & ShellCheck
            ],
        }
        with open(tmp_path / "page_1.json", "w", encoding="utf-8") as f:
            json.dump(page1, f)

        res = run_validator(tmp_path, REQUIRED_CHECKS)
        assert res.returncode == 1
        assert "[CI-GATE-FAIL] Missing 1 required CI check(s)" in res.stderr
        assert "Deployment Scripts Syntax & ShellCheck" in res.stderr


def test_ci_gate_unexpectedly_skipped_required_check():
    """A required check was skipped -> REJECT (exit 1)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        page1 = {
            "total_count": 4,
            "check_runs": [
                {"id": 1, "name": "Backend Test Suite (Python 3.12)", "status": "completed", "conclusion": "success"},
                {"id": 2, "name": "Backend Test Suite (Python 3.13)", "status": "completed", "conclusion": "success"},
                {"id": 3, "name": "Frontend Compilation & Production Build", "status": "completed", "conclusion": "skipped"},
                {"id": 4, "name": "Deployment Scripts Syntax & ShellCheck", "status": "completed", "conclusion": "success"},
            ],
        }
        with open(tmp_path / "page_1.json", "w", encoding="utf-8") as f:
            json.dump(page1, f)

        res = run_validator(tmp_path, REQUIRED_CHECKS)
        assert res.returncode == 1
        assert "[CI-GATE-FAIL]" in res.stderr
        assert "unexpectedly SKIPPED" in res.stderr
        assert "Frontend Compilation & Production Build" in res.stderr


def test_ci_gate_failed_required_check():
    """A required check failed -> REJECT (exit 1)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        page1 = {
            "total_count": 4,
            "check_runs": [
                {"id": 1, "name": "Backend Test Suite (Python 3.12)", "status": "completed", "conclusion": "failure"},
                {"id": 2, "name": "Backend Test Suite (Python 3.13)", "status": "completed", "conclusion": "success"},
                {"id": 3, "name": "Frontend Compilation & Production Build", "status": "completed", "conclusion": "success"},
                {"id": 4, "name": "Deployment Scripts Syntax & ShellCheck", "status": "completed", "conclusion": "success"},
            ],
        }
        with open(tmp_path / "page_1.json", "w", encoding="utf-8") as f:
            json.dump(page1, f)

        res = run_validator(tmp_path, REQUIRED_CHECKS)
        assert res.returncode == 1
        assert "Backend Test Suite (Python 3.12)" in res.stderr
        assert "conclusion=failure" in res.stderr


def test_ci_gate_pending_required_check():
    """A required check is in_progress -> WAIT/REJECT (exit 1)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        page1 = {
            "total_count": 4,
            "check_runs": [
                {"id": 1, "name": "Backend Test Suite (Python 3.12)", "status": "completed", "conclusion": "success"},
                {"id": 2, "name": "Backend Test Suite (Python 3.13)", "status": "in_progress", "conclusion": None},
                {"id": 3, "name": "Frontend Compilation & Production Build", "status": "completed", "conclusion": "success"},
                {"id": 4, "name": "Deployment Scripts Syntax & ShellCheck", "status": "completed", "conclusion": "success"},
            ],
        }
        with open(tmp_path / "page_1.json", "w", encoding="utf-8") as f:
            json.dump(page1, f)

        res = run_validator(tmp_path, REQUIRED_CHECKS)
        assert res.returncode == 1
        assert "[CI-GATE-WAIT]" in res.stderr
        assert "status=in_progress" in res.stderr


def test_ci_gate_pagination_accumulation():
    """Pagination across multiple pages correctly retrieves all runs -> PASS (exit 0)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        # Page 1 contains two checks
        page1 = {
            "total_count": 4,
            "check_runs": [
                {"id": 101, "name": "Backend Test Suite (Python 3.12)", "status": "completed", "conclusion": "success"},
                {"id": 102, "name": "Backend Test Suite (Python 3.13)", "status": "completed", "conclusion": "success"},
            ],
        }
        # Page 2 contains remaining two checks
        page2 = {
            "total_count": 4,
            "check_runs": [
                {"id": 103, "name": "Frontend Compilation & Production Build", "status": "completed", "conclusion": "success"},
                {"id": 104, "name": "Deployment Scripts Syntax & ShellCheck", "status": "completed", "conclusion": "success"},
            ],
        }
        with open(tmp_path / "page_1.json", "w", encoding="utf-8") as f:
            json.dump(page1, f)
        with open(tmp_path / "page_2.json", "w", encoding="utf-8") as f:
            json.dump(page2, f)

        res = run_validator(tmp_path, REQUIRED_CHECKS)
        assert res.returncode == 0
        assert "across 2 page(s)" in res.stdout
        assert "All 4 required checks passed" in res.stdout


def test_ci_gate_non_required_check_failure():
    """A non-required check on the commit failed (e.g. security audit) -> REJECT (exit 1)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        page1 = {
            "total_count": 5,
            "check_runs": [
                {"id": 1, "name": "Backend Test Suite (Python 3.12)", "status": "completed", "conclusion": "success"},
                {"id": 2, "name": "Backend Test Suite (Python 3.13)", "status": "completed", "conclusion": "success"},
                {"id": 3, "name": "Frontend Compilation & Production Build", "status": "completed", "conclusion": "success"},
                {"id": 4, "name": "Deployment Scripts Syntax & ShellCheck", "status": "completed", "conclusion": "success"},
                {"id": 5, "name": "CodeQL Security Scan", "status": "completed", "conclusion": "failure"},
            ],
        }
        with open(tmp_path / "page_1.json", "w", encoding="utf-8") as f:
            json.dump(page1, f)

        res = run_validator(tmp_path, REQUIRED_CHECKS)
        assert res.returncode == 1
        assert "Commit contains 1 failed check run(s)" in res.stderr
        assert "CodeQL Security Scan" in res.stderr
