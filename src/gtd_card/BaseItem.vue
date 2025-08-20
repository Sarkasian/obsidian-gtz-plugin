<template>
  <div class="gtd-card-item" @click="startEdit" v-if="!isEditing">
    <slot />
  </div>
  <div v-else class="gtd-card-item gtd-edit-mode">
    <input
      ref="editInput"
      v-model="editText"
      class="gtd-input"
      @keyup.enter="saveEdit"
      @keyup.esc="cancelEdit"
      @blur="saveEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

interface Props {
  onClick?: () => void;
  onEdit?: (newText: string, itemId?: string) => void;
  initialText: string;
  itemId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'edit': [newText: string, itemId?: string];
}>();

const isEditing = ref(false);
const editText = ref('');
const editInput = ref<HTMLInputElement>();

const startEdit = () => {
  if (props.onClick) {
    props.onClick();
  } else {
    editText.value = props.initialText;
    isEditing.value = true;
    nextTick(() => {
      editInput.value?.focus();
      editInput.value?.select();
    });
  }
};

const saveEdit = () => {
  if (editText.value.trim() && editText.value.trim() !== props.initialText) {
    emit('edit', editText.value.trim(), props.itemId);
  }
  isEditing.value = false;
};

const cancelEdit = () => {
  editText.value = props.initialText;
  isEditing.value = false;
};
</script>
