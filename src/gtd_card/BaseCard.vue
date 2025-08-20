<template>
  <div class="gtd-card">
    <h3 class="gtd-card-title">{{ title }}</h3>
    <div class="gtd-card-content mod-scrollable" style="max-height: 350px;">
      <slot />
      <!-- Inline new item input -->
      <div v-if="showNewInput" class="gtd-card-item gtd-edit-mode">
        <input
          ref="newItemInput"
          v-model="newItemText"
          class="gtd-input"
          placeholder="Enter new item..."
          @keyup.enter="saveNewItem"
          @keyup.esc="cancelNewItem"
          @blur="saveNewItem"
        />
      </div>
    </div>
    <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
      <button class="mod-cta" @click="showNewItemInput">+ New</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

interface Props {
  title: string;
  onCreate: (text: string) => void;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'new-item': [text: string];
}>();

const showNewInput = ref(false);
const newItemText = ref('');
const newItemInput = ref<HTMLInputElement>();

const showNewItemInput = () => {
  showNewInput.value = true;
  newItemText.value = '';
  nextTick(() => {
    newItemInput.value?.focus();
  });
};

const saveNewItem = () => {
  if (newItemText.value.trim()) {
    emit('new-item', newItemText.value.trim());
  }
  showNewInput.value = false;
  newItemText.value = '';
};

const cancelNewItem = () => {
  showNewInput.value = false;
  newItemText.value = '';
};
</script>