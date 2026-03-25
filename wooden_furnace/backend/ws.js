const WebSocket = require('ws');
const { WS_URL, HA_TOKEN } = require('./config');
const crypto = require('crypto');
const prisma = require('./client');
const state = require('./state');
const fs = require('fs');

const log = {
  info: (...args) => log.info(`[${new Date().toISOString()}]`, ...args),
  warn: (...args) => log.warn(`[${new Date().toISOString()}]`, ...args),
  error: (...args) => log.error(`[${new Date().toISOString()}]`, ...args),
};

log.info('[WS] Connecting to:', WS_URL);
log.info('[WS] Token present:', !!HA_TOKEN);
log.info('[WS] Token first 10 chars:', HA_TOKEN ? `${HA_TOKEN.substring(0, 10)}...` : 'no token');

// Function to calculate a group's configHash
function calculateConfigHash(sensorArray) {
  // Sort entityIds for idempotency: same set -> same hash
  const sorted = [...sensorArray].sort();
  const str = sorted.join(',');
  return crypto.createHash('md5').update(str).digest('hex');
}

function parseSensorGroupsUniversal(rawText) {
  const groups = [];
  const lines = rawText.split('\n');
  let currentGroup = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    // Old format: group = sensor1, sensor2
    if (line.includes('=')) {
      const [groupName, sensorStr] = line.split('=').map(s => s.trim());
      if (groupName && sensorStr) {
        const sensors = sensorStr.split(',')
          .map(s => s.trim())
          .filter(Boolean);
        groups.push({
          group_name: groupName,
          sensor_list: sensors
        });
      }
    }
    else if (line.endsWith(':')) {
      // New format: group: followed by indented sensors
      const groupName = line.slice(0, -1).trim();
      currentGroup = {
        group_name: groupName,
        sensor_list: []
      };
    }
    else if (currentGroup) {
      const sensor = line.replace(/^[-\*]\s*/, '').trim();
      if (sensor) {
        currentGroup.sensor_list.push(sensor);
      }
      // Check if next line is a new group or end of file
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      if (!nextLine || nextLine.endsWith(':') || nextLine.includes('=')) {
        if (currentGroup.sensor_list.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = null;
      }
    }
  }

  // Last group check (in case file ends without a new group)
  if (currentGroup && currentGroup.sensor_list.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

// Main initialization function
async function initializeSensorsAndGroups() {
  let groupsRaw = '';

  const optionsPath = '/data/options.json';
  if (fs.existsSync(optionsPath)) {
    const options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
    groupsRaw = options.sensor_groups || '';
  } else {
    groupsRaw = process.env.SENSOR_GROUPS || '';
  }

  if (groupsRaw.length === 0) {
    log.info('[INIT] SENSOR_GROUPS is empty.');
    return;
  }

  const groups = parseSensorGroupsUniversal(groupsRaw);
  if (groups.length === 0) {
    log.warn('[INIT] No valid sensor groups found after parsing.');
    return;
  }

  log.info('[INIT] Starting initialization of reference data...');

  for (const line of groups) {
    groupName = line.group_name;
    sensorList = line.sensor_list;

    if (!groupName || !sensorList) {
      log.warn(`[INIT] Skipping invalid line: ${line}`);
      continue;
    }

    const entityIds = sensorList.map(s => s.trim()).filter(Boolean);
    const configHash = calculateConfigHash(entityIds);

    log.info(`[INIT] Processing group "${groupName}" (${entityIds.length} sensors, hash: ${configHash})`);

    await prisma.$transaction(async (tx) => {
      // 1. Create or find the group
      const group = await tx.sensorGroup.upsert({
        where: {
          name_version: {
            name: groupName,
            version: configHash,
          },
        },
        update: {}, // If the group already exists — don't change anything
        create: {
          name: groupName,
          version: configHash,
        },
      });

      // 2. For each entityId create/find the sensor and attach it to the group
      for (const entityId of entityIds) {
        await tx.sensor.upsert({
          where: { entityId },
          update: {
            groupId: group.id, // Update group for existing sensor
          },
          create: {
            entityId,
            groupId: group.id,
          },
        });
      }

      log.info(`[INIT] Group "${groupName}" (ID: ${group.id}) ready.`);
    });
  }

  log.info('[INIT] Reference data initialization completed.');
}

// Run initialization on startup
initializeSensorsAndGroups();

// Reconnect logic
const RECONNECT_DELAY_MS = 5000;   // Initial delay before first reconnect
const RECONNECT_MAX_DELAY_MS = 60000; // Cap backoff at 60 s
let reconnectDelay = RECONNECT_DELAY_MS;
let reconnectTimer = null;
let ws = null;

function connect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  log.info('[WS] Connecting to:', WS_URL);
  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    log.info('[WS] Connected to Home Assistant');
    reconnectDelay = RECONNECT_DELAY_MS; // Reset backoff on successful connect
  });

  ws.on('message', async (data) => {
    const msg = JSON.parse(data);

    if (msg.type === 'auth_required') {
      log.info('[WS] Sending auth with token...');
      ws.send(JSON.stringify({
        type: 'auth',
        access_token: HA_TOKEN
      }));
    }

    if (msg.type === 'auth_ok') {
      log.info('[WS] Auth OK, subscribing to state_changed');
      ws.send(JSON.stringify({ id: 1, type: 'subscribe_events', event_type: 'state_changed' }));
    }

    if (msg.type === 'auth_invalid') {
      log.error('[WS] Auth invalid:', msg.message);
      // No point reconnecting with a bad token - stop here
      ws.terminate();
      return;
    }

    if (msg.type === 'event') {
      const e = msg.event;
      if (e.event_type !== 'state_changed') return;

      const entity_id = e.data?.entity_id;
      const rawValue = e.data?.new_state?.state;

      // Skip internal/system states
      if (rawValue === undefined || rawValue === null) return;
      if (['unavailable', 'unknown', 'none'].includes(String(rawValue).toLowerCase())) return;

      // Try to convert to a number
      const numericValue = parseFloat(rawValue);
      if (isNaN(numericValue)) return;

      const info = state.getSensorInfo(entity_id);
      if (!info) return;

      await prisma.log.create({
        data: {
          session: { connect: { id: info.sessionId } },
          part: { connect: { id: info.partId } },
          sensor: { connect: { id: info.sensorId } },
          sensorEntityId: entity_id,
          groupName: info.groupName,
          value: String(numericValue),
          timestamp: new Date(),
        },
      });
      // Log info
      log.info(`[WS] SensorId: ${info.sensorId} EntityId: ${entity_id} Group: ${info.groupName} → ${e.data.new_state.state}`);
    }
  });

  ws.on('error', (err) => {
    log.error('[WS] Error:', err.message);
    // 'close' will fire after 'error', reconnect happens there
  });

  ws.on('close', (code, reason) => {
    log.info(`[WS] Closed. Code: ${code}, Reason: ${reason}`);
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  log.info(`[WS] Reconnecting in ${reconnectDelay / 1000}s...`);
  reconnectTimer = setTimeout(() => {
    connect();
    // Exponential backoff, capped at max
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_DELAY_MS);
  }, reconnectDelay);
}

connect();