<template>
  <!-- Overlay -->
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/50">
    <!-- Modal -->
    <div class="bg-white shadow-xl/50 w-full max-w-md mx-4">
      <!-- Header -->
      <div class="px-6 py-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
      </div>
      <!-- Body -->
      <div class="px-6 py-4">
        <div class="space-y-4">
          <div v-for="field in fields" :key="field.key">
            <label :for="field.key" class="block text-sm font-medium text-gray-700 mb-1">{{ field.label }}</label>
            <input
              :id="field.key"
              v-model="formValues[field.key]"
              type="text"
              :placeholder="field.required ? field.placeholder + ' (required)' : field.placeholder";
              class="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
            <p v-if="errors[field.key]" class="mt-1 text-sm text-red-600"> {{ errors[field.key] }} </p>
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
        <span>{{ cancelText }}</span>
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="fields.some(field => field.required && !formValues[field.key]?.trim()) || loading"
          @click="handleSubmit"
        >
          <span>{{ confirmText }}</span>
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
  },
  title: { type: String, default: 'Modal dialog' },
  fields: { type: Array, default: () => [
    { label: 'input', key: 'text', placeholder: 'Placeholder', required: true },
  ]},
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' }
});

const validate = () => {
  let ok = true;

  for (const field of props.fields) {
    if (field.required && !formValues.value[field.key].trim()) {
      errors.value[field.key] = `${field.label} is required`
      ok = false;
    } else {
      errors.value[field.key] = '';
    }
  }
  return ok;
}

const emit = defineEmits(['close', 'confirm']);

const loading = ref(false);
const formValues = ref({});
const errors = ref({});
const error = ref('');

// Reset form when modal opens/closes
watch(() => props.show, (open) => {
  if (open) {
    formValues.value = {};
    errors.value = {};

    for (const field of props.fields) {
      formValues.value[field.key] = '';
      errors.value[field.key] = '';
    }
  }
})

const handleCancel = () => {
  emit('close');
}

const handleSubmit = async () => {
  if (!validate()) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    emit('confirm', { ...formValues.value } );
  } catch (err) {
    error.value = err.message || 'Failed';
  } finally {
    loading.value = false;
  }
}
</script>
