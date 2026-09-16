#!/usr/bin/env bash
# RailBlock AI — one-command demo startup (Linux).
# Uses the project venv at .venv (no system Python pollution).
# Starts: optimizer (:8000), .NET API (:5053, needs .NET 10 SDK), Vite frontend (:5173).
set -u
cd "$(dirname "$0")"
export PATH="$HOME/.dotnet:$PATH" DOTNET_CLI_TELEMETRY_OPTOUT=1

OPT_PORT="${OPT_PORT:-8000}"
API_URLS="${API_URLS:-http://localhost:5053}"
FE_PORT="${FE_PORT:-5173}"

up() { curl -s -m 2 -o /dev/null -w "%{http_code}" "$1" | grep -q "^200$"; }

echo "[1/3] Optimizer (:$OPT_PORT)..."
if up "http://127.0.0.1:$OPT_PORT/health"; then
  echo "  [SKIP] already up"
else
  nohup .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port "$OPT_PORT" \
    --app-dir backend/optimization-engine > /tmp/railblock-optimizer.log 2>&1 &
  echo "  started (log: /tmp/railblock-optimizer.log)"
fi

echo "[2/3] .NET API ($API_URLS)..."
if up "$API_URLS/api/optimization/data"; then
  echo "  [SKIP] already up"
elif ! command -v dotnet >/dev/null 2>&1; then
  echo "  [SKIP] dotnet SDK not installed — optimizer runs in fallback mode (reads data/*.json directly)"
else
  (cd backend/RailBlockAI.Api && ASPNETCORE_URLS="$API_URLS" nohup dotnet run --launch-profile http --no-launch-browser > /tmp/railblock-api.log 2>&1 &) 
  echo "  started (log: /tmp/railblock-api.log)"
fi

echo "[3/3] Frontend (:$FE_PORT)..."
if up "http://127.0.0.1:$FE_PORT/"; then
  echo "  [SKIP] already up"
else
  (cd frontend && nohup npm run dev -- --host 127.0.0.1 --port "$FE_PORT" > /tmp/railblock-frontend.log 2>&1 &) 
  echo "  started (log: /tmp/railblock-frontend.log)"
fi

echo
echo "Waiting for services..."
for i in $(seq 1 30); do sleep 2
  O=$(up "http://127.0.0.1:$OPT_PORT/health" && echo OK || echo "..")
  F=$(up "http://127.0.0.1:$FE_PORT/" && echo OK || echo "..")
  echo "  optimizer:$O frontend:$F"
  { [ "$O" = OK ] && [ "$F" = OK ]; } && break
done

echo
echo "============================================================"
echo "  Dashboard : http://127.0.0.1:$FE_PORT/"
echo "  Optimizer : http://127.0.0.1:$OPT_PORT/docs"
echo "  .NET API  : $API_URLS/swagger (needs dotnet SDK)"
echo "  To stop: ./stop-demo.sh"
echo "============================================================"
