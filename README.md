# RailBlock AI

```
______      _ _______ _            _     ___  _____
| ___ \    (_) | ___ \ |          | |   / _ \|_   _|
| |_/ /__ _ _| | |_/ / | ___   ___| | _/ /_\ \ | |
|    // _` | | | ___ \ |/ _ \ / __| |/ /  _  | | |
| |\ \ (_| | | | |_/ / | (_) | (__|   <| | | |_| |_
\_| \_\__,_|_|_\____/|_|\___/ \___|_|\_\_| |_/\___/
```

Intelligent railway maintenance-block planning: an optimization engine that packs
maintenance tasks into corridor windows (with shadow-block detection and ML-based
prioritization), fronted by a .NET API and a React planning dashboard.

> **Data honesty note:** the bundled dataset under `data/` is a **synthetic demo
> fixture** (one corridor, a handful of cases) — see `DATA_REALITY_AND_MIGRATION.md`.
> Do not present it as live Indian Railways operational data.

## Architecture

```
┌──────────────┐      /api/* (proxy)      ┌──────────────────┐   replay bundle   ┌─────────────────────┐
│ React + Vite │ ───────────────────────▶ │  .NET 10 WebAPI  │ ───────────────▶ │ Python FastAPI      │
│  dashboard   │                          │  :5053           │ ◀─────────────── │ optimizer :8000     │
│  :5173       │ ◀─────────────────────── │  seeds data/*.json│  /api/optimization│ ML prioritizer (sklearn)│
└──────────────┘      optimized schedule  │  forwards to :8000│  /data            │ Greedy-Shadow V2      │
                                          └──────────────────┘                   └─────────────────────┘
```

- **Frontend** (`frontend/`): Gantt timeline (daily/weekly/monthly views), work queue,
  approve/reject decision panel, triage queue, ML decision stats, activity log.
- **.NET API** (`backend/RailBlockAI.Api`): seeds `data/*.json` on startup, serves railway
  data endpoints, forwards the frozen replay bundle (`data/replay/dli-gzb/`) to the
  optimizer via `POST /api/optimization/generate`.
- **Optimization engine** (`backend/optimization-engine/main.py`): FastAPI service.
  Ranks cases with a calibrated GradientBoosting + Isotonic ML model
  (`backend/ml/`, falls back to a heuristic if the model is unavailable), then places
  them into timetable gaps with resource-capacity enforcement and cross-day coupling.

## Quickstart (Windows)

Prerequisites: **Python 3.11+**, **.NET 10 SDK**, **Node 18+**.

```bat
pip install -r backend\requirements.txt
cd frontend && npm install && cd ..

start-demo.bat     :: starts all 3 services, health-checks them, prints URLs
stop-demo.bat      :: stops all 3 services
```

| Service    | URL                            |
| ---------- | ------------------------------ |
| Dashboard  | http://127.0.0.1:5173/         |
| .NET API   | http://localhost:5053/swagger  |
| Optimizer  | http://127.0.0.1:8000/docs     |

Demo flow: open the dashboard → pick a horizon (Daily/Weekly/Monthly) → review the
work queue → **Approve** a block to relocate it on the Gantt, or **Reject** with a reason.

## Manual start (any OS)

```bash
# 1. Optimizer
cd backend/optimization-engine && python -m uvicorn main:app --host 127.0.0.1 --port 8000
# 2. .NET API
cd backend/RailBlockAI.Api && dotnet run --launch-profile http --no-launch-browser
# 3. Frontend
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```

## Configuration (`.env` files — local ports/URLs only, no secrets)

| File | Variable | Default | Read by |
| ---- | -------- | ------- | ------- |
| `backend/optimization-engine/.env` | `DOTNET_API_BASE` | `http://localhost:5053` | `main.py` (via python-dotenv) |
| `frontend/.env` | `VITE_API_TARGET` | `http://localhost:5053` | `vite.config.ts` dev proxy |
| — | `ASPNETCORE_URLS` | launch profile (`:5053`) | `start-demo.bat` sets it for `dotnet run` |

`.env.example` files document the same knobs; real `.env` files are git-ignored.

## Key API endpoints

| Method | URL | Purpose |
| ------ | --- | ------- |
| POST | `/api/optimization/generate?horizon=daily&days=1` | Run the optimizer on the replay bundle |
| GET | `/api/optimization/triage?...` | Triage-only rollup + ranked queue |
| GET | `/api/optimization/data` | Raw tasks + corridor windows (optimizer input) |
| GET | `/api/optimization/current` | Last generated schedule |
| GET | `/api/railwaydata/*` | Seeded block requests, tasks, defects, windows, sections, trains |

## Repo layout

```
data/                    synthetic demo fixture + frozen replay bundle (data/replay/dli-gzb/)
data-generator/          script + schemas that produced the fixture
backend/RailBlockAI.Api/ .NET 10 API (seed, controllers, replay-bundle service)
backend/optimization-engine/  FastAPI optimizer (scheduling + replay algorithms)
backend/ml/              prioritizer model, training script, pickled model
frontend/                React + Vite + Tailwind dashboard
start-demo.bat / stop-demo.bat   one-command demo lifecycle
```

## Docs

- `RAILWAYS_PROJECT_SELF_AUDIT.md` — dated self-audit (Sept 4; predates several fixes)
- `DATA_REALITY_AND_MIGRATION.md` — what the data is/isn't and the path to real feeds

## Status & roadmap

Working: full generate pipeline (verified HTTP 200 with real scheduled blocks), ML-active
prioritization, Gantt + approval UI, triage queue. Known gaps: tiny single-corridor demo
dataset, approve/reject verdicts are UI-local (no persistence endpoint yet), weekly/monthly
horizons day-shift a single frozen day. See team plan for the SIH submission phases.
