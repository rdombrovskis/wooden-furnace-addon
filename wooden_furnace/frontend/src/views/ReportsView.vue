<template>
  <div class="min-h-screen p-6 bg-gray-50 text-gray-900">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Header with session metadata -->
      <header class="border-b pb-2">
        <h3 class="text-2xl font-bold tracking-tight">
          Session report #{{ session?.id }}
        </h3>
        <div class="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <div class="text-gray-500">Created</div>
            <div>{{ formatDate(session?.createdAt) || '—' }}</div>
          </div>
          <div>
            <div class="text-gray-500">Start</div>
            <div>{{ formatDate(session?.startTime) || '—' }}</div>
          </div>
          <div>
            <div class="text-gray-500">End</div>
            <div>{{ formatDate(session?.endTime) || '—' }}</div>
          </div>
        </div>
      </header>

      <!-- Loading/error state -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading data...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {{ error }}
      </div>

      <!-- If no data -->
      <div v-else-if="!logs.length" class="text-center py-12 text-gray-500">
        No logs found for this session.
      </div>

      <!-- Main content: parts list -->
      <section v-else>
        <h2 class="text-xl font-semibold mb-2">Parts in session</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="part in parts"
            :key="part.id"
            class="bg-white border rounded-lg py-2 px-4 cursor-pointer hover:shadow transition-shadow"
            :class="{ 'ring-2 ring-blue-500': selectedPartId === part.id }"
            @click="selectPart(part.id)"
          >
            <div class="font-medium">{{ part.name }}</div>
            <div class="text-sm text-gray-500 mt-1">
              Sensor group: {{ part.groupName }}
            </div>
            <div class="text-sm text-gray-500">
              Log entries: {{ part.logCount }}
            </div>
          </div>
        </div>

        <!-- If a part is selected -->
        <div v-if="selectedPart" class="mt-12">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold">
              Part: {{ selectedPart.name }}
            </h3>
            <button
              @click="selectedPartId = null; selectedPart = null;"
              class="text-sm text-gray-500 hover:text-gray-700"
            >
              Collapse
            </button>
          </div>

          <!-- Temperature fields T1–T4 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div v-for="(label, idx) in temperatureLabels" :key="idx">
              <label class="block text-sm text-gray-700 mb-1">{{ label }}</label>
              <input
                v-model.number="temperatures[idx]"
                type="number"
                step="0.1"
                class="w-full border rounded px-3 py-2"
                placeholder="°C"
              />
            </div>
          </div>
          <button
            @click="generateReport"
            class="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            Generate report
          </button>

          <!-- Chart -->
          <div v-if="chartData" class="mt-10">
            <h4 class="text-lg font-semibold mb-4">Temperature chart</h4>
            <div class="bg-white p-4 rounded-lg border">
              <div class="chart-container" style="position: relative; height: 400px;">
                <Line :data="chartData" :options="chartOptions" ref="chartRef"/>
              </div>
            </div>
          </div>

          <!-- Process events -->
          <div v-if="events.length" class="mt-10">
            <h4 class="text-lg font-semibold mb-4">Process events</h4>
            <div class="bg-white p-4 rounded-lg border">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-500 border-b">
                    <th class="pb-2">Event</th>
                    <th class="pb-2">Time</th>
                    <th class="pb-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                          <tr v-for="event in events" :key="event.label" class="border-b last:border-0">
                            <td class="py-3">{{ event.label }}</td>
                            <td class="py-3">{{ event.reached === false ? '—' : formatDate(event.time) }}</td>
                            <td class="py-3">
                              <span v-if="event.reached === false" class="text-red-600">Not reached</span>
                              <span v-else-if="event.duration != null">{{ `${event.duration} min` }}</span>
                              <span v-else>—</span>
                            </td>
                          </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { getSessionById, getLogs, fetchConfig } from './../api/index.js';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';

const chartRef = ref(null);

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  annotationPlugin
);

// Fixed palette for chart datasets
const FIXED_COLORS = [
  '#FF3B30', // red
  '#5856D6', // purple
  '#007AFF', // blue
  '#34C759', // green
  '#FF9500', // orange
  '#AF52DE', // magenta
  '#FFCC00', // yellow
  '#5AC8FA', // light blue
  '#FF2D55', // pink
  '#8E8E93', // gray
];

const route = useRoute();
const session = ref(null);
const config = ref(null);
const logs = ref([]);
const loading = ref(false);
const error = ref(null);
const selectedPartId = ref(null);
const temperatures = ref([55, 60, 70, 40]); // T1–T4 defaults
const chartData = ref(null);
const events = ref([]);
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'time',
      time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm',
          },
        },
      title: { display: true, text: 'Time' },
    },
    y: {
      title: { display: true, text: 'Temperature (°C)' },
    },
  },
  plugins: {
    annotation: {
      annotations: {}
    }
  }
};

const temperatureLabels = [
  'T1 (gelation)',
  'T2 (polymerization)',
  'T3 (baking)',
  'T4 (demolding)',
];

// Group logs by parts
const parts = computed(() => {
  const partsMap = new Map();
  logs.value.forEach(log => {
    if (!log.part) return;
    const partId = log.part.id;
    if (!partsMap.has(partId)) {
      partsMap.set(partId, {
        id: partId,
        name: log.part.partNames?.name || 'Untitled',
        groupName: log.part.sensorGroup?.name || '—',
        logCount: 0,
        sensors: new Set(),
      });
    }
    const part = partsMap.get(partId);
    part.logCount++;
    if (log.sensor) part.sensors.add(log.sensor.entityId);
  });
  return Array.from(partsMap.values());
});

// Selected part
const selectedPart = computed(() =>
  parts.value.find(p => p.id === selectedPartId.value)
);

onMounted(async () => {
  await loadData();
  config.value = await fetchConfig();
});

async function loadData() {
  loading.value = true;
  try {
    // Load session
    session.value = await getSessionById(route.params.sessionId);
    // Load logs for the session period
    const logsData = await getLogs({
      sessionId: session.value.id,
      from: session.value.startTime || undefined,
      to: session.value.endTime || undefined,
    });
    logs.value = logsData;
  } catch (err) {
    error.value = err.message;
    console.error('Error loading:', err);
  } finally {
    loading.value = false;
  }
}

function selectPart(partId) {
  selectedPartId.value = partId;
  // reset previous chart/events and prepare new chart
  chartData.value = null;
  events.value = [];
  prepareChart();
}

function prepareChart() {
  if (!selectedPart.value) return;

  // Filter logs by selected part
  const _partLogs = logs.value.filter(l => l.part?.id === selectedPartId.value);
  const partLogs = smoothBySensor(_partLogs, config.value.filterTargetPps ?? 100, config.value.filterWindowSize ?? 5);

  // Group by sensors
  const sensorsMap = new Map();
  partLogs.forEach(log => {
    if (!log.sensor) return;
    const sensorId = log.sensor.id;
    if (!sensorsMap.has(sensorId)) {
      sensorsMap.set(sensorId, {
        label: log.sensor.entityId,
        data: [],
      });
    }
    sensorsMap.get(sensorId).data.push({
      x: new Date(log.timestamp),
      y: parseFloat(log.value) || 0,
    });
  });

  chartData.value = {
    datasets: Array.from(sensorsMap.values()).map((ds, idx) => ({
      label: ds.label,
      data: ds.data,
      borderColor: FIXED_COLORS[idx % FIXED_COLORS.length],
      backgroundColor: FIXED_COLORS[idx % FIXED_COLORS.length] + '20',
      tension: 0.1,
    })),
  };
}

function updateChartAnnotations(events) {
  if (!chartRef.value?.chart) return;

  const annotations = {};
  
  events.forEach((event, idx) => {
    const color = getEventColor(event.label);
    annotations[`event${idx}`] = {
      type: 'line',
      xMin: event.time,
      xMax: event.time,
      borderColor: color,
      borderWidth: 2,
      label: {
        display: true,
        content: event.label,
        position: 'start',
        backgroundColor: color,
        color: 'white',
        font: { size: 10 },
      },
    };
  });

  chartRef.value.chart.options.plugins.annotation.annotations = annotations;
  chartRef.value.chart.update();
}

function getEventColor(label) {
  const colors = {
    'Reached T1': '#4CAF50',
    'Reached T2': '#FF9800',
    'Reached T3': '#F44336',
    'T3 Hold': '#9C27B0',
    'Cooled to T4': '#2196F3',
  };
  return colors[label] || '#000';
}

function generateReport() {
  if (!selectedPart.value || !chartRef.value) return;

  const chart = chartRef.value.chart; 
  const visibleDatasetIndices = [];
  
  // Determine which sensors are visible
  chart.data.datasets.forEach((dataset, idx) => {
    if (chart.isDatasetVisible(idx)) {
      visibleDatasetIndices.push(idx);
    }
  });

  // Get entityIds of visible sensors
  const visibleSensorIds = new Set();
  visibleDatasetIndices.forEach(idx => {
    const dataset = chart.data.datasets[idx];
    const sensorId = dataset.label;
    visibleSensorIds.add(sensorId);
  });

  // Filter logs by visible sensors
  const filteredLogs = logs.value.filter(l => 
    l.part?.id === selectedPartId.value && 
    visibleSensorIds.has(l.sensor?.entityId)
  );

  if (filteredLogs.length === 0) return;

  // Smooth (function works with full logs)
  const smoothedLogs = smoothBySensor(filteredLogs, config.value.filterTargetPps ?? 100, config.value.filterWindowSize ?? 5);

  // Now convert to simple format for calculations
  const partLogs = smoothedLogs.map(l => ({
    time: new Date(l.timestamp),
    value: parseFloat(l.value) || 0,
  }));

  if (partLogs.length === 0) {
    events.value = [{ label: 'Start', time: null, duration: null, reached: false }];
    updateChartAnnotations([]);
    return;
  }

  const [T1, T2, T3, T4] = temperatures.value;
  const eventsList = [];

  // Start
  eventsList.push({ label: 'Start', time: partLogs[0].time, reached: true  });

  // Reached T1
  const t1Event = partLogs.find(l => l.value >= T1);
  if (!t1Event) {
    eventsList.push({ label: 'Reached T1', time: null, duration: null, reached: false });
    events.value = eventsList;
    updateChartAnnotations(eventsList.filter(e => e.reached));
    return;
  }
  const startT1 = partLogs[0].time;
  const endT1 = t1Event.time;
  const T1duration = Math.round((endT1 - startT1) / 60000); // minutes
  if (t1Event) eventsList.push({ label: 'Reached T1', time: t1Event.time, duration: T1duration, reached: true });

  // Reached T2
  const t2Event = partLogs.find(l => l.value >= T2);
  if (!t2Event) {
    eventsList.push({ label: 'Reached T2', time: null, duration: null, reached: false });
    events.value = eventsList;
    updateChartAnnotations(eventsList.filter(e => e.reached));
    return;
  }
  const T2duration = Math.round((t2Event.time - endT1) / 60000); // minutes
  if (t2Event) eventsList.push({ label: 'Reached T2', time: t2Event.time, duration: T2duration, reached: true });

  // Reached T3 and hold
const t3Logs = partLogs.filter(l => l.value >= (T3 - 1));
let endT3 = t2Event.time;
if (t3Logs.length) {

  const t3Event = t3Logs.find(l => l.value >= T3);
  if (!t3Event) {
    eventsList.push({ label: 'Reached T3', time: null, duration: null, reached: false });
    events.value = eventsList;
    updateChartAnnotations(eventsList.filter(e => e.reached));
    return;
  }
  const startT3 = t3Event.time;
  endT3 = t3Logs[t3Logs.length - 1].time; 
  
  const durationToT3 = Math.round((t3Event.time - t2Event.time) / 60000); // minutes from T2 to T3
  const holdDuration = Math.round((endT3 - startT3) / 60000); // hold duration within >= T3-1

  eventsList.push({ label: 'Reached T3', time: startT3, duration: durationToT3, reached: true });
  eventsList.push({ label: 'T3 Hold', time: endT3, duration: holdDuration, reached: true });
}
  // Cooling to T4
  const afterT3 = partLogs.filter(l => l.time > (endT3 || new Date()));
  const t4Event = afterT3.find(l => l.value <= T4);
  if (!t4Event) {
    eventsList.push({ label: 'Cooled to T4', time: null, duration: null, reached: false });
    events.value = eventsList;
    updateChartAnnotations(eventsList.filter(e => e.reached));
    return;
  }
  const durationToT4 = t4Event ? Math.round((t4Event.time - (endT3 || new Date())) / 60000) : null;
  if (t4Event) eventsList.push({ label: 'Cooled to T4', time: t4Event.time, duration: durationToT4, reached: true });
  
  events.value = eventsList;

  updateChartAnnotations(eventsList.filter(e => e.reached));
}

function smoothBySensor(logs, targetPointsPerSensor, windowSize) {
  // 1. Group by sensorId
  const bySensor = new Map();
  logs.forEach(log => {
    if (!log.sensor) return;
    const sensorId = log.sensor.id;
    if (!bySensor.has(sensorId)) {
      bySensor.set(sensorId, []);
    }
    bySensor.get(sensorId).push(log);
  });

  // 2. Smooth each sensor separately
  const result = [];
  for (const [sensorId, sensorLogs] of bySensor) {
    // Sort by time
    const sorted = sensorLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Median filter
    const medianFiltered = [];
    for (let i = 0; i < sorted.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(sorted.length, i + Math.ceil(windowSize / 2));
      const window = sorted.slice(start, end);
      const values = window.map(l => parseFloat(l.value)).sort((a, b) => a - b);
      medianFiltered.push({
        ...sorted[i],
        value: values[Math.floor(values.length / 2)],
      });
    }

    // Decimate to targetPointsPerSensor
    const step = Math.max(1, Math.ceil(medianFiltered.length / targetPointsPerSensor));
    for (let i = 0; i < medianFiltered.length; i += step) {
      result.push(medianFiltered[i]);
    }
  }

  // 3. Return all smoothed logs sorted by time
  return result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>
