#!/bin/sh
set -e

echo "──────────────────────────────────────────────"
echo " AP e-Procurement API (Python) — starting up"
echo "──────────────────────────────────────────────"

echo "→ Creating / syncing database tables..."
python -c "from app.database import create_tables; create_tables()"

echo "→ Checking if seed needed..."
python seed.py

echo "→ Starting AP e-Procurement API on port 3000..."
exec uvicorn main:app --host 0.0.0.0 --port 3000 --no-access-log
