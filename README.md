
# Wooden Furnace Add-on

Home Assistant add-on for session-based temperature logging during heat-treatment processes.

Designed to collect temperature data from multiple sensors, group them logically, and store structured logs bound to sessions and parts.

## Overview

The add-on operates with four core entities:

- **SensorGroup** — logical grouping of HA sensors  
- **Session** — single heating cycle  
- **Part** — item processed during a session  
- **Log** — timestamped measurement  

All logs belong to a session and a part.  
Sensor groups are versioned to preserve history when composition changes.

## Architecture

#### Backend
Node.js + Express + Prisma (SQLite)

#### Frontend
Vue 3 + TailwindCSS + jsPDF


## Configuration

Add-on options (configured via Home Assistant UI):

    sensor_groups: ""
    database_url: "/data/db.sqlite"
    filter_target_pps: 500
    filter_window_size: 5

### Options

#### `sensor_groups`

Sensor group definitions:

    group_name = sensor.entity_1, sensor.entity_2
    another_group = sensor.entity_3, sensor.entity_4

Groups are parsed on startup and synchronized with the database.
If the composition of a group changes, a new version of that group is created under the same name.

#### `database_url`

Path to the SQLite database file inside container.
Normally should be left at the default value unless there is a specific need to change it.

#### `filter_target_pps`

Target points‑per‑sensor after filtering (range: 10–1000).

#### `filter_window_size`

Median filter window size (range: 2–50).  
Used to reduce short‑term noise in sensor readings.


## Local Development

Environment variables used by the `backend` when running outside Home Assistant:

- **HA_URL** — base URL of the Home Assistant WebSocket API, e.g. `https://myassistant.org:8910/api/websocket`
- **HA_TOKEN** — long‑lived access token generated in Home Assistant
- **DATABASE_URL** — path to the SQLite database file (usually `/data/db.sqlite`)
- **SENSOR_GROUPS** — sensor group definitions in the same format as in the add‑on configuration
