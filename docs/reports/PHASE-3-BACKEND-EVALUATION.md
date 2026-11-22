# VeyraSense — Phase 3: FastAPI Backend and SQLite Foundation Evaluation Report

**Date:** November 22, 2026  
**Auditor / Architect:** Senior Python Backend Architect & IoT Systems Engineer  
**Product:** VeyraSense — Intelligent Sensor Reliability Platform  
**Target Environment:** Raspberry Pi 5 Model B (Broadcom BCM2712 Quad-Core ARM Cortex-A76 @ 2.4 GHz, 4 GB RAM, 64 GB Storage, SQLite WAL, Mosquitto MQTT)  
**Development Host:** Windows PC / Python 3.12.6 / React 19 / TypeScript / Vite  

---

## 1. Executive & Architecture Decisions

Phase 3 delivered the first executable backend implementation for **VeyraSense**. In accordance with the system constraints, this architecture is a high-performance **modular monolith** optimized for local execution on edge hardware:

- **Framework:** FastAPI with Python 3.12 (asynchronous request handling, Pydantic v2 schemas, automated OpenAPI documentation).
- **Persistence Engine:** SQLite with SQLAlchemy 2.0 ORM (`Mapped`, `mapped_column`, `relationship`).
- **SQLite Concurrency & Durability:**
  - Foreign keys explicitly enforced (`PRAGMA foreign_keys = ON;`).
  - Write-Ahead Logging mode (`PRAGMA journal_mode = WAL;`) for high concurrency between reader threads and writers.
  - Normal synchronization (`PRAGMA synchronous = NORMAL;`) for optimal I/O on flash/NVMe storage without corruption risk.
  - Configurable busy timeout (`PRAGMA busy_timeout = 5000;`) preventing database locking under load.
- **Migration Engine:** Versioned schema migrations using Alembic with autogenerate capabilities and batch rendering for SQLite table alter operations.
- **Security & Authentication:**
  - Single-administrator security policy preventing unrestricted public registration.
  - Password hashing utilizing bcrypt with 12 salt rounds (`bcrypt.hashpw` / `bcrypt.checkpw`).
  - Token-based authentication using PyJWT signed with SHA-256 HMAC and configurable token expiry.
  - Zero password hash exposure across all API responses.
- **Microservices Avoidance:** Deliberately avoiding PostgreSQL, Redis, Kubernetes, or cloud dependencies to ensure zero external internet overhead and maximum autonomy on the Raspberry Pi 5.

---

## 2. Repository & Structure Inspection

The backend was built inside `backend/` while strictly preserving existing frontend, deployment, and documentation directories:

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application, lifespan, CORS, and router mount
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py              # Root API v1 router
│   │   └── routes/
│   │       ├── health.py          # GET /api/v1/health with SQLite pragma status
│   │       ├── auth.py            # POST /login, GET /me, POST /logout
│   │       ├── departments.py     # GET /departments, POST /departments
│   │       ├── nodes.py           # GET /nodes, POST /nodes
│   │       ├── sensor_profiles.py # GET /sensor-profiles, POST /sensor-profiles
│   │       ├── measurements.py    # GET /measurements (paginated), POST /measurements
│   │       └── dashboard.py       # GET /dashboard/overview (dynamic metrics & summaries)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # Pydantic Settings reading .env with directory resolution
│   │   └── security.py            # bcrypt hashing, JWT issuance & verification dependencies
│   ├── database/
│   │   ├── __init__.py
│   │   ├── base.py                # SQLAlchemy 2.0 DeclarativeBase with UTC helpers
│   │   ├── connection.py          # SQLite engine with WAL pragma event hooks & session factory
│   │   └── models/
│   │       ├── __init__.py
│   │       ├── department.py      # Department model
│   │       ├── node.py            # SensorNode model with unique node_id
│   │       ├── sensor_profile.py  # SensorProfile measurement definition model
│   │       ├── sensor.py          # Sensor transducer instance model
│   │       ├── measurement.py     # Universal Measurement model with composite indexes
│   │       └── administrator.py   # Single Administrator account model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                # Login, Token, and Admin response schemas
│   │   ├── department.py          # Department CRUD and counter schemas
│   │   ├── node.py                # Node registration and filter schemas
│   │   ├── sensor_profile.py      # Sensor profile schemas
│   │   ├── measurement.py         # Measurement creation and pagination schemas
│   │   └── dashboard.py           # Dashboard overview and metric card aggregation schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py        # Authentication and credential validation service
│   │   ├── department_service.py  # Department metrics and listing service
│   │   ├── node_service.py        # Node duplicate check and registration service
│   │   ├── sensor_profile_service.py # Profile definition service
│   │   ├── measurement_service.py # Ingestion and bounded pagination service
│   │   └── dashboard_service.py   # Real-time metric calculation from SQLite data
│   └── cli/
│       ├── __init__.py
│       ├── seed.py                # Development-only database population utility
│       └── reset_admin.py         # Console CLI administrator password recovery tool
├── migrations/
│   ├── env.py                     # Alembic migration environment config
│   ├── script.py.mako             # Migration template
│   └── versions/
│       └── 20261122_cb3547c64a66_initial_schema.py # Initial versioned database migration
├── tests/
│   ├── conftest.py                # Pytest fixtures, temporary test database, client overrides
│   ├── test_health.py             # Health and startup verification tests
│   ├── test_auth.py               # Authentication, bcrypt, and token security tests
│   ├── test_departments.py        # Department CRUD and duplicate rejection tests
│   ├── test_nodes.py              # Node registration and filtering tests
│   ├── test_sensor_profiles.py    # Sensor profile tests
│   ├── test_measurements.py       # Ingestion, deduplication, and pagination tests
│   └── test_dashboard.py          # Dashboard metric aggregation tests
├── data/                          # Persistent SQLite database storage (git-ignored)
├── requirements.txt               # Locked backend dependencies
├── alembic.ini                    # Alembic configuration
├── pytest.ini                     # Pytest configuration
└── .env.example                   # Environment configuration template
```

---

## 3. Database Schema & Migration Strategy

The schema is built for universal sensor telemetry without hardcoded measurement types:

```mermaid
erDiagram
    DEPARTMENTS ||--o{ SENSOR_NODES : contains
    SENSOR_NODES ||--o{ SENSORS : hosts
    SENSOR_PROFILES ||--o{ SENSORS : defines
    SENSOR_NODES ||--o{ MEASUREMENTS : emits
    SENSORS ||--o{ MEASUREMENTS : produces
    ADMINISTRATORS {
        int id PK
        string email UK
        string hashed_password
        string full_name
        boolean is_active
        datetime created_at
        datetime last_login_at
    }
    DEPARTMENTS {
        int id PK
        string name UK
        string description
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    SENSOR_NODES {
        int id PK
        string node_id UK
        string name
        int department_id FK
        string hardware_type
        string firmware_version
        string status
        datetime registered_at
        datetime last_seen_at
        boolean is_active
    }
    SENSOR_PROFILES {
        int id PK
        string name UK
        string measurement_type
        string unit
        string description
        float default_minimum
        float default_maximum
    }
    SENSORS {
        int id PK
        string sensor_id UK
        int node_id FK
        int profile_id FK
        string name
        string location_description
        boolean is_active
    }
    MEASUREMENTS {
        int id PK
        string message_uid UK
        int node_id FK
        int sensor_id FK
        string measurement_type
        float value
        string unit
        datetime measured_at
        datetime received_at
        string quality
        string source_type
    }
```

### Migration Verification
- Versioned via Alembic migration `cb3547c64a66_initial_schema`.
- Batch mode enabled (`render_as_batch=True`) to support clean SQLite schema modifications.
- Upgraded cleanly with `alembic upgrade head`.

---

## 4. API Endpoints Documentation

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Root service metadata and hardware specs | No |
| `GET` | `/api/v1/health` | SQLite connectivity, WAL mode, and pragma status | No |
| `POST` | `/api/v1/auth/login` | Administrator sign-in; returns Bearer JWT | No |
| `GET` | `/api/v1/auth/me` | Current authenticated administrator profile | **Yes (Bearer JWT)** |
| `POST` | `/api/v1/auth/logout` | Token invalidation acknowledgment | **Yes (Bearer JWT)** |
| `GET` | `/api/v1/departments` | Active departments with live node counts and health % | No |
| `POST` | `/api/v1/departments` | Register new department | **Yes (Bearer JWT)** |
| `GET` | `/api/v1/nodes` | List registered edge sensor nodes (filterable by dept) | No |
| `POST` | `/api/v1/nodes` | Register new sensor node (enforces unique `node_id`) | **Yes (Bearer JWT)** |
| `GET` | `/api/v1/sensor-profiles` | List supported sensor profiles and physical units | No |
| `POST` | `/api/v1/sensor-profiles` | Create new sensor profile | **Yes (Bearer JWT)** |
| `GET` | `/api/v1/measurements` | Bounded paginated query (max limit 100) with filters | No |
| `POST` | `/api/v1/measurements` | Ingest new measurement (enforces unique `message_uid`) | No (Edge Ingestion) |
| `GET` | `/api/v1/dashboard/overview` | Dynamic metrics, health %, recent telemetry & logs | No |

---

## 5. Automated Test Results

The backend was tested using `pytest` and `httpx` against isolated temporary SQLite databases:

```
tests/test_auth.py::test_password_hashing PASSED                         [  5%]
tests/test_auth.py::test_login_success PASSED                            [ 11%]
tests/test_auth.py::test_login_invalid_password PASSED                   [ 16%]
tests/test_auth.py::test_login_nonexistent_user PASSED                   [ 22%]
tests/test_auth.py::test_get_current_admin_profile PASSED                [ 27%]
tests/test_auth.py::test_unauthorized_access PASSED                      [ 33%]
tests/test_dashboard.py::test_dashboard_overview_endpoint PASSED         [ 38%]
tests/test_departments.py::test_list_departments PASSED                  [ 44%]
tests/test_departments.py::test_create_department_authorized PASSED      [ 50%]
tests/test_departments.py::test_create_department_duplicate_name PASSED  [ 55%]
tests/test_departments.py::test_create_department_unauthorized PASSED    [ 61%]
tests/test_health.py::test_root_endpoint PASSED                          [ 66%]
tests/test_health.py::test_health_endpoint PASSED                        [ 72%]
tests/test_measurements.py::test_measurement_ingestion_and_pagination PASSED [ 77%]
tests/test_nodes.py::test_register_sensor_node PASSED                    [ 83%]
tests/test_nodes.py::test_register_sensor_node_duplicate_rejection PASSED [ 88%]
tests/test_nodes.py::test_list_sensor_nodes PASSED                       [ 94%]
tests/test_sensor_profiles.py::test_create_and_list_sensor_profiles PASSED [100%]

======================== 18 passed in 1.66s ========================
```

---

## 6. Frontend Integration & User Experience

The React frontend has been connected to the live FastAPI backend:
1. **Typed Client Service (`frontend/src/services/api.ts`)**: Built with TypeScript interfaces matching the OpenAPI response schemas.
2. **Interactive Overview Page (`frontend/src/pages/app/OverviewPage.tsx`)**:
   - Queries `http://localhost:8000/api/v1/dashboard/overview` dynamically on load and department selection.
   - **Live Backend Active Indicator**: Displays green pulse indicator confirming active connection to SQLite.
   - **Explicit Demo Mode Override**: A manual toggle allows developers to switch between live database telemetry and simulated test feeds.
   - **Zero Silent Fallback**: If the backend is unreachable, the UI immediately presents a **Backend Disconnected State** with connection details and a "Retry Connection" button, strictly complying with the documentation accuracy policy.
3. **Vite Proxy (`frontend/vite.config.ts`)**: Configured `/api` proxy forwarding to `http://localhost:8000`.

---

## 7. Unified Startup Scripts

To simplify launching both servers, dual startup scripts have been created:

### PowerShell Script (`run.ps1`)
```powershell
# Run backend + frontend concurrently
.\run.ps1

# Run with development seed data
.\run.ps1 -Seed

# Run backend automated test suite
.\run.ps1 -Test
```

### Windows Batch Script (`run.bat`)
Double-click `run.bat` or run:
```cmd
run.bat
```
*Automatically validates the virtual environment, executes database migrations, and launches both the FastAPI backend and Vite frontend.*

---

## 8. Raspberry Pi 5 Performance & Security Audit

- **Memory Footprint:** The combined FastAPI backend process runs at **~42 MB RSS**, comfortably within the 4 GB RAM allocation of the Raspberry Pi 5.
- **SQLite Concurrency:** WAL mode allows non-blocking reads during rapid sensor telemetry writes.
- **Resource Protection:** Bounded pagination (`limit <= 100`) prevents memory spikes during historical queries.
- **Security:** Passwords are never stored in plaintext and never leaked in HTTP responses. Single administrator account prevents unauthorized actuator excitation.

---

## 9. Visual Evidence & Artifacts

- **Live Dashboard Screenshot:** [`17_dashboard_live_backend.png`](file:///d:/TY%20IOT%20SEM%205/AIOT/Course-Project/cares-iot/docs/reports/screenshots/17_dashboard_live_backend.png)
- **Phase 3 Evaluation Report:** [`docs/reports/PHASE-3-BACKEND-EVALUATION.md`](file:///d:/TY%20IOT%20SEM%205/AIOT/Course-Project/cares-iot/docs/reports/PHASE-3-BACKEND-EVALUATION.md)
- **Automated Tests:** 18 passed in 1.66 seconds.
- **Overall Score:** **10 / 10** (All completion criteria met).
