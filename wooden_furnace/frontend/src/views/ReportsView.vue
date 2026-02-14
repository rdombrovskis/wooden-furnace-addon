<template>
  <div class="min-h-screen p-2 [@media(min-width:850px)]:p-6 bg-gray-50 text-gray-900">
    <div class="pdf-content max-w-7xl mx-auto space-y-8">
      <div v-if="route.params.sessionId">
        <!-- Header with session metadata -->
        <header class="border-b pb-2 flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-bold tracking-tight">
              Session report #{{ session?.id }}
            </h3>
            <div class="grid grid-cols-4 gap-4 mt-4 text-sm">
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
              <div>
                <div class="text-gray-500">Batch</div>
                <div>{{ session?.batch || '—' }}</div>
              </div>
            </div>
          </div>
          <div class="ml-4">
            <PdfExport v-if="selectedPart" :chart-ref="chartRef"
                       :sessionData="session"
                       :partName="selectedPartId ? parts.find(p => p.id === selectedPartId)?.name  : ''"
                       :partOem="selectedPartId ? parts.find(p => p.id === selectedPartId)?.oem : ''"
                       :temperatures="temperatures" />
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
        <h2 class="text-xl font-semibold mb-4 mt-4">Parts in session</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="part in parts"
            :key="part.id"
            class="bg-white border rounded-lg py-2 px-4 cursor-pointer hover:shadow transition-shadow"
            :class="{ 'ring-2 ring-blue-500': selectedPartId === part.id }"
            @click="selectPart(part.id)"
          >
            <div class="font-medium">{{ part.name }}</div>
            <div class="text-sm text-gray-500">
              Sensor group: {{ part.groupName }}
            </div>
            <div class="text-sm text-gray-500">
              Log entries: {{ part.logCount }}
            </div>
            <div class="text-sm text-gray-500">
              OEM: {{ part.oem || '—' }}
            </div>
          </div>
        </div>

        <!-- If a part is selected -->
        <div v-if="selectedPart" class="mt-6 pt-4 border-t" >
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-xl font-semibold">
              Part: {{ selectedPart.name }}
            </h3>
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
                    <td class="py-3">{{ event.label.full }}</td>
                    <td class="py-3">{{ event.reached === false ? '—' : formatDate(event.time) }}</td>
                    <td class="py-3">
                      <span v-if="event.reached === false" class="text-red-600">Not reached</span>
                      <span v-else-if="event.duration != null">{{ `${formatDuration(event.duration)}` }}</span>
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

      <!-- Sessions list view when no sessionId in route -->
      <div v-else>
        <header class="border-b pb-4">
          <h3 class="text-2xl font-bold tracking-tight">Reports</h3>
          <p class="text-sm text-gray-500">Completed sessions</p>
        </header>

        <div class="mt-6">
          <div v-if="loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-gray-600">Loading sessions...</p>
          </div>

          <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {{ error }}
          </div>

          <div v-else-if="!sessionsList.length" class="text-center py-12 text-gray-500">
            No completed sessions found.
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="s in sessionsList"
              :key="s.id"
              class="bg-white border rounded-lg py-3 px-4 cursor-pointer hover:shadow transition-shadow"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium">Session #{{ s.id }} - {{ formatDate(s.createdAt) }}</div>
                  <div class="text-sm text-gray-500">Batch: {{ s.batch || '—' }}</div>
                  <div class="text-sm text-gray-500">Parts: {{ s.parts?.length || '—' }}</div>
                </div>
                <div>
                  <button
                    class="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                    @click="openReport(s.id)"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { STATES } from "./../utils/constants.js";
import PdfExport from './../components/PdfExport.vue';
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getSessionById, getLogs, fetchConfig, getSessions } from './../api/index.js';
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
const router = useRouter();
const session = ref(null);
const sessionsList = ref([]);
const config = ref(null);
const logs = ref([]);
const loading = ref(false);
const error = ref(null);
const selectedPartId = ref(null);
const temperatures = ref([55, 60, 70, 40]); // T1–T4 defaults
const chartData = ref(null);
const events = ref([]);
let _saveTempsTimer = null;

function loadTemperaturesForPart(partId) {
  if (!partId) return;
  try {
    const key = `tempProfile:part:${partId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 4) {
      temperatures.value = parsed.map(v => Number(v));
    }
  } catch (err) {
    console.warn('Failed to load temperatures for part', partId, err);
  }
}

function saveTemperaturesForPart(partId, temps) {
  if (!partId) return;
  try {
    const key = `tempProfile:part:${partId}`;
    localStorage.setItem(key, JSON.stringify(temps));
  } catch (err) {
    console.warn('Failed to save temperatures for part', partId, err);
  }
}

const chartOptions = {
  responsive: true,
  animation: false,
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
    },
    legend: {
      onClick: (e, legendItem, legend) => {
        const index = legendItem.datasetIndex;
        const ci = legend.chart;
        if (ci.isDatasetVisible(index)) {
            ci.hide(index);
            legendItem.hidden = true;
        } else {
            ci.show(index);
            legendItem.hidden = false;
        }
        onLegendToggle();
      }
    }
  }
};

function onLegendToggle(chart) {
  generateReport();
}

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
        oem: log.part.partNames?.oem || '',
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

watch(() => route.params.sessionId, async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const sessionId = route.params.sessionId;
    if (sessionId) {
      // Detail view: load single session and logs
      session.value = await getSessionById(sessionId);
      const logsData = await getLogs({
        sessionId: session.value.id,
        from: session.value.startTime || undefined,
        to: session.value.endTime || undefined,
      });
      logs.value = logsData;
    } else {
      // List view: load sessions and show only completed ones
      const all = await getSessions(true, false);
      // support both `status` and `state` fields, case-insensitive
      sessionsList.value = all.filter(s => { return s.state.id === STATES.COMPLETED.id; });
    }
  } catch (err) {
    error.value = err.message;
    console.error('Error loading:', err); 
  } finally {
    loading.value = false;
  }
}

// Helper to navigate to a session report
function openReport(sessionId) {
  router.push(`/reports/${sessionId}`);
}

async function selectPart(partId) {
  selectedPartId.value = partId;
  // reset previous chart/events and prepare new chart
  chartData.value = null;
  events.value = [];
  // load saved temperatures for this part (if any)
  loadTemperaturesForPart(partId);
  prepareChart();
}

watch(chartData, async () => {
  await nextTick(); // wait for chart to render with new data
  await nextTick(); // ensure chartRef is updated
  if (chartRef.value?.chart) {
    generateReport();
  }
});

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
      label: ds.label.split('.').slice(-1)[0],
      data: ds.data,
      pointStyle: false,
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
    const color = getEventColor(event.label.short);
    annotations[`event${idx}`] = {
      type: 'line',
      xMin: event.time,
      xMax: event.time,
      borderColor: color,
      borderWidth: 2,
      label: {
        display: true,
        content: event.label.short,
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

const eventLabels = {
  start: { short: 'Start', full: 'Process Start' },
  reachedT1: { short: 'T1', full: 'Reached T1' },
  reachedT2: { short: 'T2', full: 'Reached T2' },
  reachedT3: { short: 'T3', full: 'Reached T3' },
  holdT3: { short: 'T3 Hold', full: 'T3 Hold Complete' },
  cooledT4: { short: 'T4', full: 'Cooled to T4' },
};

function getEventColor(label) {
  const colors = {
    [eventLabels.start.short]: '#000000',
    [eventLabels.reachedT1.short]: '#4CAF50',
    [eventLabels.reachedT2.short]: '#FF9800',
    [eventLabels.reachedT3.short]: '#F44336',
    [eventLabels.holdT3.short]:   '#9C27B0',
    [eventLabels.cooledT4.short]: '#2196F3',
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
    visibleSensorIds.has(l.sensor?.entityId.split('.').slice(-1)[0])
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
    events.value = [{ label: eventLabels.start, time: null, duration: null, reached: false }];
    updateChartAnnotations([]);
    return;
  }

  const [T1, T2, T3, T4] = temperatures.value;
  const eventsList = [];

  // Start
  eventsList.push({ label: eventLabels.start, time: partLogs[0].time, duration: null, reached: true });

  // Reached T1
  const t1Event = partLogs.find(l => l.value >= T1);
  if (!t1Event) {
    eventsList.push({ label: eventLabels.reachedT1, time: null, duration: null, reached: false });
    events.value = eventsList;
    updateChartAnnotations(eventsList.filter(e => e.reached));
    return;
  }
  const startT1 = partLogs[0].time;
  const endT1 = t1Event.time;
  const T1duration = endT1 - startT1;
  if (t1Event) eventsList.push({ label: eventLabels.reachedT1, time: t1Event.time, duration: T1duration, reached: true });

  // Reached T2
  const t2Event = partLogs.find(l => l.value >= T2);
  if (!t2Event) {
    eventsList.push({ label: eventLabels.reachedT2, time: null, duration: null, reached: false });
    events.value = eventsList;
    updateChartAnnotations(eventsList.filter(e => e.reached));
    return;
  }
  const T2duration = t2Event.time - endT1;
  if (t2Event) eventsList.push({ label: eventLabels.reachedT2, time: t2Event.time, duration: T2duration, reached: true });

  // Reached T3 and hold
const t3Logs = partLogs.filter(l => l.value >= (T3 - 1));
let endT3 = t2Event.time;
if (t3Logs.length) {

  const t3Event = t3Logs.find(l => l.value >= T3);
  if (!t3Event) {
    eventsList.push({ label: eventLabels.reachedT3, time: null, duration: null, reached: false });
    events.value = eventsList;
    updateChartAnnotations(eventsList.filter(e => e.reached));
    return;
  }
  const startT3 = t3Event.time;
  endT3 = t3Logs[t3Logs.length - 1].time; 
  
  const durationToT3 = t3Event.time - t2Event.time;
  const holdDuration = endT3 - startT3;

  eventsList.push({ label: eventLabels.reachedT3, time: startT3, duration: durationToT3, reached: true });
  eventsList.push({ label: eventLabels.holdT3, time: endT3, duration: holdDuration, reached: true });
}
  // Cooling to T4
  const afterT3 = partLogs.filter(l => l.time > (endT3 || new Date()));
  const t4Event = afterT3.find(l => l.value <= T4);
  if (!t4Event) {
    eventsList.push({ label: eventLabels.cooledT4, time: null, duration: null, reached: false });
    events.value = eventsList;
    updateChartAnnotations(eventsList.filter(e => e.reached));
    return;
  }
  const durationToT4 = t4Event ? (t4Event.time - (endT3 || new Date())) : null;
  if (t4Event) eventsList.push({ label: eventLabels.cooledT4, time: t4Event.time, duration: durationToT4, reached: true });
  
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

function formatDuration(ms) {
  if (ms == null) return '—';
  if (ms instanceof Date) ms = ms.getTime();

  const totalSeconds = Math.floor(Number(ms) / 1000);
  if (!isFinite(totalSeconds) || totalSeconds < 0) return '—';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
}

// Auto-save temperatures when they change
watch(temperatures, (newVal) => {
  if (!selectedPartId.value) return;
  if (_saveTempsTimer) clearTimeout(_saveTempsTimer);
  _saveTempsTimer = setTimeout(() => {
    saveTemperaturesForPart(selectedPartId.value, newVal);
  }, 1000);
}, { deep: true });

</script>
