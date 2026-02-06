module.exports = {
  WS_URL: process.env.HA_URL ?
    `${process.env.HA_URL.replace(/^http/, 'ws')}/api/websocket` :
    'ws://supervisor/core/websocket',
  HA_TOKEN: process.env.HA_TOKEN || process.env.SUPERVISOR_TOKEN
};