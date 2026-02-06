<template>
  <!-- Overlay -->
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/50">
    <!-- Modal -->
    <div class="bg-white shadow-xl/50 w-full max-w-md mx-4">
      <!-- Header -->
      <div class="px-6 py-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">Add New Part</h3>
      </div>
      <!-- Body -->
      <div class="px-6 py-4">
        <div class="space-y-4">
          <div>
            <label for="part-name" class="block text-sm font-medium text-gray-700 mb-1">Part Name</label>
            <input
              id="part-name"
              v-model="partName"
              type="text"
              placeholder="Enter part name"
              class="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
            <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          @click="handleCancel"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!partName.trim() || loading"
          @click="handleSubmit"
        >
          <span v-if="!loading">Add Part</span>
          <span v-else>Adding...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'confirm'])

const partName = ref('')
const error = ref('')
const loading = ref(false)

// Reset form when modal opens/closes
watch(() => props.show, (newVal) => {
  if (newVal) {
    partName.value = ''
    error.value = ''
    loading.value = false
  }
})

const handleCancel = () => {
  emit('close')
}

const handleSubmit = async () => {
  if (!partName.value.trim()) {
    error.value = 'Part name is required'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    // Emit the new part name to parent
    emit('confirm', partName.value.trim())
  } catch (err) {
    error.value = err.message || 'Failed to add part'
  } finally {
    loading.value = false
  }
}
</script>
