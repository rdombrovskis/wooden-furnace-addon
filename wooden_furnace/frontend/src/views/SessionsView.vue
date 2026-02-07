<template>
  <div class="min-h-screen p-2 [@media(min-width:850px)]:p-6 bg-white text-gray-900">
    <div class="max-w-7xl mx-auto space-y-6">
      <header class="border-b pb-4">
        <h3 class="text-2xl font-bold tracking-tight">Sessions</h3>
        <p class="text-sm text-gray-500">Manage sessions and view reports</p>
      </header>

      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading sessions...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {{ error }}
      </div>

      <section v-else-if="sessions.length > 0">
        <table class="w-full text-sm border-separate border-spacing-y-2 hidden [@media(min-width:1000px)]:table">
          <thead class="text-left text-gray-500">
            <tr>
              <th class="px-4 py-2">ID</th>
              <th class="px-4 py-2">Parts</th>
              <th class="px-4 py-2">Created</th>
              <th class="px-4 py-2">Start</th>
              <th class="px-4 py-2">End</th>
              <th class="px-4 py-2">Status</th>
              <th class="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="session in sessions"
              :key="session.id"
              class="bg-gray-50 hover:bg-gray-100 rounded"
            >
              <td class="px-4 py-2 font-mono text-blue-600">#{{ session.id }}</td>
              <td class="px-4 py-2" :title="formatParts(session.parts)">
                {{ formatParts(session.parts) }}
              </td>
              <td class="px-4 py-2">{{ formatDate(session.createdAt) }}</td>
              <td class="px-4 py-2">{{ formatDate(session.startTime) }}</td>
              <td class="px-4 py-2">{{ formatDate(session.endTime) }}</td>
              <td class="px-4 py-2">
                <span
                  class="px-3 py-1 rounded-full text-xs font-bold uppercase"
                  :class="statusStyle(session.state.name)"
                >
                  {{ session.state.name }}
                </span>
              </td>
              <td class="px-4 py-2">
                <div class="flex gap-2">
                  <button
                    @click="startSession(session)"
                    :disabled="!canStart(session)"
                    class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start
                  </button>
                  <button
                    @click="stopSession(session)"
                    :disabled="!canStop(session)"
                    class="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Stop
                  </button>
                  <button
                    @click="completeSession(session)"
                    :disabled="!canComplete(session)"
                    class="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Complete
                  </button>
                  <button
                    @click="goToReport(session.id)"
                    :disabled="!canReport(session)"
                    class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Report
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

      <!-- MOBILE VERSION -->
      <div
        v-for="session in sessions"
        :key="session.id"
        class="[@media(min-width:1000px)]:hidden bg-gray-50 rounded p-4 mb-4 shadow-sm"
      >
        <div class="grid grid-cols-2 gap-y-2 gap-x-4 items-start">
          <div>
            <div class="mb-1">
              <span class="font-semibold">ID:</span>
              <span class="font-mono text-blue-600"> #{{ session.id }}</span>
            </div>
            <div class="mb-1">
              <span class="font-semibold">Parts:</span>
              {{ formatParts(session.parts) }}
            </div>
            <div class="mb-1">
              <span class="font-semibold">Created:</span>
              {{ formatDate(session.createdAt) }}
            </div>
            <div class="mb-1">
              <span class="font-semibold">Start:</span>
              {{ formatDate(session.startTime) }}
            </div>
            <div class="mb-1">
              <span class="font-semibold">End:</span>
              {{ formatDate(session.endTime) }}
            </div>
            <div class="mb-1">
              <span class="font-semibold">Status:</span>
              <span
                class="px-3 py-1 rounded-full text-xs font-bold uppercase ml-2"
                :class="statusStyle(session.state.name)"
              >
                {{ session.state.name }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-3 justify-start items-end">
            <button
              @click="startSession(session)"
              :disabled="!canStart(session)"
              class="px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed w-24 text-center"
            >
              Start
            </button>
            <button
              @click="stopSession(session)"
              :disabled="!canStop(session)"
              class="px-3 py-2 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed w-24 text-center"
            >
              Stop
            </button>
            <button
              @click="completeSession(session)"
              :disabled="!canComplete(session)"
              class="px-3 py-2 bg-gray-700 text-white text-xs rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed w-24 text-center"
            >
              Complete
            </button>
            <button
              @click="goToReport(session.id)"
              :disabled="!canReport(session)"
              class="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-24 text-center"
            >
              Report
            </button>
          </div>
        </div>
      </div>
      </section>
      <div v-else class="text-center py-12 text-gray-500">
        No sessions created.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getSessions, updateSession } from "./../api/index.js";

const router = useRouter();

const sessions = ref([]);
const loading = ref(false);
const error = ref(null);

// State constants to avoid magic numbers and strings
const STATES = {
  CREATED: { id: 1, name: 'CREATED' },
  IN_PROGRESS: { id: 2, name: 'IN PROGRESS' },
  STOPPED: { id: 3, name: 'STOPPED' },
  COMPLETED: { id: 4, name: 'COMPLETED' },
};

// Map styles using the names from STATES to avoid duplicated literals
const STATUS_STYLES = {
  [STATES.CREATED.name]: 'bg-blue-100 text-blue-800',
  [STATES.IN_PROGRESS.name]: 'bg-green-100 text-green-800',
  [STATES.STOPPED.name]: 'bg-yellow-100 text-yellow-800',
  [STATES.COMPLETED.name]: 'bg-gray-100 text-gray-800',
};

onMounted(async () => {
  await loadSessions();
});

async function loadSessions() {
  loading.value = true;
  try {
    sessions.value = await getSessions(true, false);
  } catch (err) {
    error.value = err?.message || String(err);
    console.error('Error loading sessions:', err);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatParts(parts) {
  if (!parts || parts.length === 0) return '—';
  return parts.map(p => p.partNames?.name).filter(Boolean).join(', ');
}

function goToReport(id) {
  router.push(`/reports/${id}`);
}

// Status colors
function statusStyle(statusName) {
  return STATUS_STYLES[statusName] || 'bg-gray-100 text-gray-800';
}

// Button availability logic
function canStart(session) {
  return [STATES.CREATED.name, STATES.STOPPED.name].includes(session.state.name);
}

function canStop(session) {
  return session.state.name === STATES.IN_PROGRESS.name;
}

function canComplete(session) {
  return [STATES.IN_PROGRESS.name, STATES.STOPPED.name].includes(session.state.name);
}

function canReport(session) {
  return session.state.name === STATES.COMPLETED.name;
}

// Button handlers
async function startSession(session) {
  try {
    await updateSession(session.id, { stateId: STATES.IN_PROGRESS.id, startTime: new Date().toISOString() });
    await loadSessions();
  } catch (err) {
    error.value = err?.message || String(err);
    console.error('Start error:', err);
  }
}

async function stopSession(session) {
  try {
    await updateSession(session.id, { stateId: STATES.STOPPED.id });
    await loadSessions();
  } catch (err) {
    error.value = err?.message || String(err);
    console.error('Stop error:', err);
  }
}

async function completeSession(session) {
  try {
    await updateSession(session.id, { stateId: STATES.COMPLETED.id, endTime: new Date().toISOString() });
    await loadSessions();
  } catch (err) {
    error.value = err?.message || String(err);
    console.error('Complete error:', err);
  }
}


</script>