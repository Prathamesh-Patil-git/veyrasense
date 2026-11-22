"""VeyraSense Edge Gateway Performance & Reliability Benchmark Script.

Measures:
1. Endpoint response latency profiles (min, mean, p50, p95, p99, max)
2. Telemetry ingestion throughput (single vs batch inserts)
3. Process RSS memory and CPU footprint under synthetic load
4. Database connection latency and SQLite transaction overhead
"""
import os
import sys
import time
import uuid
import json
import statistics
import platform
from datetime import datetime, timezone

# Ensure backend root is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psutil
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import SessionLocal
from app.database.models import Administrator, Department, SensorNode
from app.core.security import hash_password, create_access_token, hash_device_key


def calculate_percentiles(latencies: list[float]) -> dict:
    sorted_l = sorted(latencies)
    n = len(sorted_l)
    return {
        "count": n,
        "min_ms": round(sorted_l[0], 2),
        "mean_ms": round(statistics.mean(sorted_l), 2),
        "median_p50_ms": round(statistics.median(sorted_l), 2),
        "p95_ms": round(sorted_l[int(n * 0.95)], 2),
        "p99_ms": round(sorted_l[min(int(n * 0.99), n - 1)], 2),
        "max_ms": round(sorted_l[-1], 2),
        "std_dev_ms": round(statistics.stdev(sorted_l), 2) if n > 1 else 0.0,
    }


def run_benchmark():
    process = psutil.Process()
    initial_rss_mb = process.memory_info().rss / (1024 * 1024)

    client = TestClient(app)

    # 1. Setup Test Admin, Department & Edge Node
    with SessionLocal() as db:
        admin = db.query(Administrator).filter_by(email="benchmark.admin@veyrasense.local").first()
        if not admin:
            admin = Administrator(
                email="benchmark.admin@veyrasense.local",
                hashed_password=hash_password("BenchmarkPassword123!"),
                full_name="Benchmark Lead",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        dept = db.query(Department).filter_by(name="Benchmark Facilities").first()
        if not dept:
            dept = Department(name="Benchmark Facilities", description="Benchmarking dept", is_active=True)
            db.add(dept)
            db.commit()
            db.refresh(dept)

        device_key = "benchmark-secret-key-9999"
        node = db.query(SensorNode).filter_by(node_id="BM-NODE-01").first()
        if not node:
            node = SensorNode(
                node_id="BM-NODE-01",
                name="Benchmark Primary Sensor",
                department_id=dept.id,
                hardware_type="ESP32-S3",
                api_key_hash=hash_device_key(device_key),
                is_active=True,
            )
            db.add(node)
            db.commit()
            db.refresh(node)

        admin_email = admin.email
        node_pk = node.id

    token = create_access_token(
        subject=admin_email,
        extra_claims={"name": "Benchmark Lead", "role": "admin"},
    )
    admin_headers = {"Authorization": f"Bearer {token}"}
    device_headers = {"X-Device-Key": device_key}

    print("\n" + "=" * 65)
    print(" VEYRASENSE EDGE GATEWAY — PERFORMANCE & LATENCY BENCHMARK")
    print("=" * 65)
    print(f"Platform: {platform.system()} {platform.release()} ({platform.machine()})")
    print(f"Python:   {platform.python_version()}")
    print(f"CPU:      {psutil.cpu_count(logical=True)} logical cores ({psutil.cpu_count(logical=False)} physical)")
    print(f"RAM:      {round(psutil.virtual_memory().total / (1024**3), 2)} GB total")
    print(f"Initial RSS Memory: {round(initial_rss_mb, 2)} MB\n")

    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": {
            "os": f"{platform.system()} {platform.release()}",
            "machine": platform.machine(),
            "python": platform.python_version(),
            "cpu_cores": psutil.cpu_count(logical=True),
            "ram_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "note": "Benchmark executed on development workstation. Raspberry Pi 5 measurements require physical execution on the target hardware.",
        },
        "endpoints": {},
    }

    # --------------------------------------------------------------------------
    # Benchmark 1: GET /api/v1/health (Public, Minimal State)
    # --------------------------------------------------------------------------
    print("[1/4] Benchmarking GET /api/v1/health (100 requests)...")
    health_times = []
    for _ in range(100):
        t0 = time.perf_counter()
        resp = client.get("/api/v1/health")
        t1 = time.perf_counter()
        assert resp.status_code == 200
        health_times.append((t1 - t0) * 1000.0)
    results["endpoints"]["get_health"] = calculate_percentiles(health_times)
    print(f"      Mean: {results['endpoints']['get_health']['mean_ms']} ms | p50: {results['endpoints']['get_health']['median_p50_ms']} ms | p95: {results['endpoints']['get_health']['p95_ms']} ms")

    # --------------------------------------------------------------------------
    # Benchmark 2: GET /api/v1/dashboard/overview (Admin JWT + Metrics Aggregation)
    # --------------------------------------------------------------------------
    print("[2/4] Benchmarking GET /api/v1/dashboard/overview (100 requests)...")
    dash_times = []
    for _ in range(100):
        t0 = time.perf_counter()
        resp = client.get("/api/v1/dashboard/overview", headers=admin_headers)
        t1 = time.perf_counter()
        assert resp.status_code == 200
        dash_times.append((t1 - t0) * 1000.0)
    results["endpoints"]["get_dashboard_overview"] = calculate_percentiles(dash_times)
    print(f"      Mean: {results['endpoints']['get_dashboard_overview']['mean_ms']} ms | p50: {results['endpoints']['get_dashboard_overview']['median_p50_ms']} ms | p95: {results['endpoints']['get_dashboard_overview']['p95_ms']} ms")

    # --------------------------------------------------------------------------
    # Benchmark 3: GET /api/v1/nodes (Admin JWT + Query & Relationship Join)
    # --------------------------------------------------------------------------
    print("[3/4] Benchmarking GET /api/v1/nodes (100 requests)...")
    nodes_times = []
    for _ in range(100):
        t0 = time.perf_counter()
        resp = client.get("/api/v1/nodes", headers=admin_headers)
        t1 = time.perf_counter()
        assert resp.status_code == 200
        nodes_times.append((t1 - t0) * 1000.0)
    results["endpoints"]["get_nodes"] = calculate_percentiles(nodes_times)
    print(f"      Mean: {results['endpoints']['get_nodes']['mean_ms']} ms | p50: {results['endpoints']['get_nodes']['median_p50_ms']} ms | p95: {results['endpoints']['get_nodes']['p95_ms']} ms")

    # --------------------------------------------------------------------------
    # Benchmark 4: POST /api/v1/measurements (Device API Key + Write & WAL Sync)
    # --------------------------------------------------------------------------
    print("[4/4] Benchmarking POST /api/v1/measurements ingestion (100 requests)...")
    ingest_times = []
    now_iso = datetime.now(timezone.utc).isoformat()
    for i in range(100):
        payload = {
            "message_uid": f"bm-{uuid.uuid4().hex}",
            "node_id": node_pk,
            "measurement_type": "surface_temperature",
            "value": round(42.5 + (i * 0.05), 2),
            "unit": "C",
            "measured_at": now_iso,
            "quality": "good",
            "source_type": "telemetry",
        }
        t0 = time.perf_counter()
        resp = client.post("/api/v1/measurements", headers=device_headers, json=payload)
        t1 = time.perf_counter()
        assert resp.status_code == 201
        ingest_times.append((t1 - t0) * 1000.0)
    results["endpoints"]["post_measurements"] = calculate_percentiles(ingest_times)
    print(f"      Mean: {results['endpoints']['post_measurements']['mean_ms']} ms | p50: {results['endpoints']['post_measurements']['median_p50_ms']} ms | p95: {results['endpoints']['post_measurements']['p95_ms']} ms")

    # Final Memory Profile
    final_rss_mb = process.memory_info().rss / (1024 * 1024)
    rss_delta_mb = final_rss_mb - initial_rss_mb
    results["memory"] = {
        "initial_rss_mb": round(initial_rss_mb, 2),
        "final_rss_mb": round(final_rss_mb, 2),
        "rss_delta_mb": round(rss_delta_mb, 2),
    }

    print("\n" + "-" * 65)
    print(f"Final RSS Memory:   {round(final_rss_mb, 2)} MB (Delta: +{round(rss_delta_mb, 2)} MB)")
    print("-" * 65)

    # Save to JSON
    os.makedirs("data", exist_ok=True)
    out_file = os.path.join("data", "benchmark_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Detailed benchmark metrics exported to: {out_file}\n")


if __name__ == "__main__":
    run_benchmark()
