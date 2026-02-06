require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

app.use(express.json());
app.use(cors());

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

const prisma = require('./client');
const state = require('./state');
const ws = require('./ws');

const partNamesRouter = require('./routes/partNames.js');
const sensorGroupsRouter = require('./routes/sensorGroups');
const sessionsRouter = require('./routes/sessions');
const logsRouter = require('./routes/logs');

async function initialize() {
  try {
    await state.restoreActiveSessions();
    console.log('[INIT] State restored');
  } catch (err) {
    console.error('[INIT] Error restoring state:', err);
  }
}

async function ensureSessionStates() {
  const statuses = ['CREATED', 'IN PROGRESS', 'STOPPED', 'COMPLETED'];
  for (const name of statuses) {
    await prisma.sessionState.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('[INIT] SessionStates verified/initialized');
}

initialize();
ensureSessionStates();


app.listen(8080, () => {
  console.log('Backend listening on port 8080');
});

app.use('/api/part-names', partNamesRouter); 
app.use('/api/sensor-groups', sensorGroupsRouter);
app.use('/api/sessions', sessionsRouter); 
app.use('/api/logs', logsRouter);

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})