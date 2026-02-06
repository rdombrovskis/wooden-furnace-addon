#!/usr/bin/env sh

echo "========================================"
echo "Wooden Furnace Addon - Starting..."
echo "========================================"

CONFIG_PATH="/data/options.json"
if [ ! -f "$CONFIG_PATH" ]; then
    echo "ERROR: $CONFIG_PATH not found!"
    echo "Make sure the addon is properly configured in Home Assistant"
    exit 1
fi

export NODE_CONFIG=$(node -e "
try {
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
  
  const result = {
    FILTER_TARGET_PPS: config.filter_target_pps ?? 500,
    FILTER_WINDOW_SIZE: config.filter_window_size ?? 5,
    DATABASE_URL: config.database_url ? 'file:' + config.database_url : 'file:/data/db.sqlite',
  };
  
  for (const [key, value] of Object.entries(result)) {
    process.stdout.write(\`export \${key}='\${value}'\n\`);
  }
} catch (err) {
  console.error('Config parse error:', err.message);
  process.exit(1);
}
")

eval "$NODE_CONFIG"

echo "Environment check:"
echo "  SUPERVISOR_TOKEN: $(if [ -n "$SUPERVISOR_TOKEN" ]; then echo "✓ Present (${#SUPERVISOR_TOKEN} chars)"; else echo "✗ MISSING!"; fi)"
echo "  HA_URL: ${HA_URL:-not set}"
echo "  FILTER_TARGET_PPS: ${FILTER_TARGET_PPS:-not set}"
echo "  FILTER_WINDOW_SIZE: ${FILTER_WINDOW_SIZE:-not set}"
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
