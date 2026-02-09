<template>
  <div class="min-h-screen p-2 [@media(min-width:850px)]:p-6 bg-white text-gray-900">
    <div class="max-w-7xl mx-auto space-y-6">
      <header class="border-b pb-4 flex items-center justify-between">
        <div>
          <h3 class="text-2xl font-bold tracking-tight">Parts</h3>
          <p class="text-sm text-gray-500">Assign thermometer groups to parts</p>
        </div>
        <div class="ml-4">
          <button
            class="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            @click="showPartModal = true"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Part
          </button>
        </div>
      </header>
      <div class="grid grid-cols-1 [@media(min-width:850px)]:grid-cols-2 gap-6">
          
        <!-- Parts table -->
        <div>    
          <table class="min-w-full divide-y divide-gray-200 bg-white text-gray-900 rounded-md shadow">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left">Name</th>
                <th class="px-4 py-2 text-left">OEM</th>
                <th class="px-4 py-2 text-left">Group</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="part in parts" :key="part.id" class="bg-white hover:bg-gray-50">
                <td class="px-4 py-2">{{ part.name }}</td>
                <td class="px-4 py-2">{{ part.oem }}</td>
                <td class="px-4 py-2">
                  <select
                    :id="`part-id-${part.id}`"
                    v-model="part.selectedGroup"
                    class="bg-white border border-gray-300 text-gray-900 rounded px-2 py-1"
                  >
                    <option value="">-- select group --</option>
                    <option v-for="group in visibleThermometerGroups" :key="group.id" :value="group.id">
                      {{ group.id + ': ' + group.name }}
                    </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 'New Session' button -->
          <div class="mt-4">
            <button
              class="px-4 py-2 rounded-md font-semibold transition-colors
                    bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-600"
              :disabled="!hasSelectedParts || loading"
              @click="showBatchModal = true"
            >
              <span v-if="!loading">New Session</span>
              <span v-else>Creating...</span>
            </button>
          </div>
        </div>

        <!-- Thermometer groups tree -->
        <div class="flex justify-end">
          <div class="w-full max-w-xs">
            <header class="border-b pb-4">
              <h2 class="text-2xl font-bold tracking-tight">Thermometers</h2>
              <p class="text-sm text-gray-500">Thermometer groups are defined in configuration</p>
            </header>
            <ul class="space-y-2 mt-4">
              <li v-for="group in visibleThermometerGroups" :key="group.id">
                <div class="font-semibold text-gray-900">{{ group.id + ': ' + group.name }}</div>
                <ul class="ml-4 space-y-1">
                  <li
                    v-for="sensor in group.sensors"
                    :key="sensor.id"
                    class="text-gray-700"
                  >
                    {{ sensor.entityId }}
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ModalInput :show="showPartModal" 
              title="New Part"
              :fields="[
                { key: 'name', label: 'Part Name', placeholder: 'Enter name', required: true },
                { key: 'oem', label: 'OEM Code', placeholder: 'Enter OEM', required: false }
              ]"
              confirmText="Add Part"
              @close="showPartModal = false" 
              @confirm="handleNewPart" />
  <ModalInput :show="showBatchModal" 
              title="Batch number"
              :fields="[
                { key: 'batch', label: 'Batch number', placeholder: 'Enter batch number', required: false }
              ]"
              confirmText="Confirm"
              @close="showBatchModal = false" 
              @confirm="startSession" />`
</template>

<script setup>
import { reactive, computed, onMounted, ref } from 'vue';
import { getPartNames, getSensorGroups, createSession, createPart } from "./../api/index.js";
import { useRouter } from 'vue-router';
import ModalInput from '../components/ModalInput.vue'

const router = useRouter();
const loading = ref(false);
const showPartModal = ref(false);
const showBatchModal = ref(false);

const visibleThermometerGroups = computed(() =>
  thermometerGroups.value.filter(g => g.sensors && g.sensors.length > 0)
);

// Placeholder for parts
const parts = reactive([]);

// Placeholder for thermometer groups
const thermometerGroups = ref([]);

const handleNewPart = async (part) => {
  try {
    // API call to create new part
    const newPart = await createPart(part);
    
    parts.push({
      id: newPart.id,
      name: newPart.name,
      oem: newPart.oem,
      selectedGroup: ""
    });
    showPartModal.value = false;
  } catch (err) {
    console.error('Failed to create part:', err);
    alert('Failed to create part: ' + err.message);
  }
}

onMounted(async () => {
  const list = await getPartNames();

  list.forEach((p) => {
    parts.push({
      id: p.id,
      name: p.name,
      oem: p.oem, 
      selectedGroup: "",
    });
  });

  thermometerGroups.value = await getSensorGroups();

});


// Check: is at least one part selected
const hasSelectedParts = computed(() =>
  parts.some((p) => p.selectedGroup !== '')
);

// Start session (POST request)
const startSession = async (data) => {
  loading.value = true;

  const selected = parts
    .filter((p) => p.selectedGroup !== '')
    .map((p) => ({
      partNameId: p.id,
      sensorGroupId: parseInt(p.selectedGroup),
    }));

  showBatchModal.value = false;  

  try {
      const sessionData = {
        tag: `session_${Date.now()}`,
        parts: selected,
        batch: data.batch || null
      };
      const session = await createSession(sessionData);
      console.log('Session created:', session);
      // Navigate to created session view
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      console.error('Session creation error:', err.message);
      // Show error to user
      alert('Session creation error: ' + err.message);
    } finally {
      loading.value = false;
    }

  loading.value = false;
  // Navigate to sessions list
  router.push('/sessions');
};
</script>