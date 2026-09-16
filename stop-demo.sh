#!/usr/bin/env bash
# RailBlock AI — stop demo services (Linux).
pkill -f "uvicorn main:app" 2>/dev/null && echo "stopped optimizer" || echo "optimizer not running"
pkill -f "RailBlockAI.Api" 2>/dev/null && echo "stopped .NET API" || echo ".NET API not running"
pkill -f "vite.*5173" 2>/dev/null; pkill -f "vite" 2>/dev/null && echo "stopped frontend" || echo "frontend not running"
