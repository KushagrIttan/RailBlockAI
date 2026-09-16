#!/usr/bin/env python3
"""RailBlockAI smoke test — stdlib only, no extra deps.

Checks the live demo stack:
  1. Optimizer  (:8000)  /health -> 200, ML active
  2. Optimizer  (:8000)  /data-optimize -> all tasks scheduled
  3. .NET API   (:5053)  /api/optimization/data -> tasks + windows
  4. Decisions round-trip: POST /api/decisions (approve) then GET contains it
  5. Frontend   (:5173)  / -> 200

Usage:
  python3 scripts/smoke.py                       # full stack (local demo running)
  python3 scripts/smoke.py --skip-dotnet --skip-frontend   # CI: optimizer only

Override ports: OPT_BASE, API_BASE, FE_BASE env vars.
"""
import json
import os
import sys
import urllib.request

OPT_BASE = os.environ.get("OPT_BASE", "http://127.0.0.1:8000")
API_BASE = os.environ.get("API_BASE", "http://localhost:5053")
FE_BASE = os.environ.get("FE_BASE", "http://127.0.0.1:5173")

passed, failed = 0, 0


def check(name, fn):
    global passed, failed
    try:
        detail = fn()
        passed += 1
        print(f"  [PASS] {name} {detail or ''}")
    except Exception as e:  # noqa: BLE001
        failed += 1
        print(f"  [FAIL] {name}: {e}")


def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        if r.status != 200:
            raise AssertionError(f"HTTP {r.status}")
        return json.loads(r.read().decode())


def post(url, payload):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        if r.status not in (200, 201):
            raise AssertionError(f"HTTP {r.status}")
        return json.loads(r.read().decode())


def main():
    args = set(sys.argv[1:])
    print("RailBlockAI smoke test")

    print("-> optimizer")
    check("health", lambda: (
        lambda h: f"(engine={h['engine']}, ml={h.get('ml_prioritization')})"
        if h.get("status") == "healthy" else (_ for _ in ()).throw(
            AssertionError(f"unhealthy: {h}"))
    )(get(f"{OPT_BASE}/health")))
    check("data-optimize schedules all", lambda: (
        lambda o: f"({o['scheduled_tasks']}/{o['total_tasks']} scheduled)"
        if o["total_tasks"] > 0 and o["scheduled_tasks"] == o["total_tasks"]
        else (_ for _ in ()).throw(AssertionError(f"unscheduled tasks: {o}"))
    )(get(f"{OPT_BASE}/data-optimize?days=1")))

    if "--skip-dotnet" not in args:
        print("-> .NET API")
        check("optimization data", lambda: (
            lambda d: f"({len(d.get('tasks', []))} tasks, "
                      f"{len(d.get('corridorWindows', d.get('corridor_windows', [])))} windows)"
            if d.get("tasks") else (_ for _ in ()).throw(
                AssertionError("no tasks returned"))
        )(get(f"{API_BASE}/api/optimization/data")))

        def decisions_roundtrip():
            rec = post(f"{API_BASE}/api/decisions", {
                "blockId": "SMOKE-TEST", "verdict": "approve",
                "horizon": "daily", "corridorId": "DLI-GZB"})
            listing = get(f"{API_BASE}/api/decisions")
            if not any(d.get("blockId") == "SMOKE-TEST"
                       or d.get("block_id") == "SMOKE-TEST" for d in listing):
                raise AssertionError("posted verdict missing from listing")
            return f"(id={rec.get('id')})"

        check("decisions round-trip", decisions_roundtrip)

    if "--skip-frontend" not in args:
        print("-> frontend")
        check("dashboard serves", lambda: (
            lambda: "(HTTP 200)"
            if urllib.request.urlopen(FE_BASE + "/", timeout=30).status == 200
            else (_ for _ in ()).throw(AssertionError("not 200"))
        )())

    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
