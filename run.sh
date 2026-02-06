#!/usr/bin/env sh

echo "========================================"
echo "Wooden Furnace Addon - Starting..."
echo "========================================"

export DATABASE_URL="file:${DATABASE_URL:-/data/db.sqlite}"

echo "Environment check:"
echo "  SUPERVISOR_TOKEN: $(if [ -n "$SUPERVISOR_TOKEN" ]; then echo "✓ Present (${#SUPERVISOR_TOKEN} chars)"; else echo "✗ MISSING!"; fi)"
echo "  HA_URL: ${HA_URL:-not set}"
echo "  DATABASE_URL: ${DATABASE_URL:-not set}"

if [ -z "$SUPERVISOR_TOKEN" ]; then
    echo "ERROR: SUPERVISOR_TOKEN is not set!"
    echo "Check your addon configuration in Home Assistant"
    exit 1
fi

if [ ! -z "$DATABASE_URL" ]; then
echo "[Prisma] Applying migrations..."
npx prisma migrate deploy
fi

echo "Starting Node.js application..."
echo "========================================"

exec node index.js
