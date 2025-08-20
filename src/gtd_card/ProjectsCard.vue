<template>
  <BaseCard title="Projects" :onCreate="handleCreate" @new-item="handleNewItem">
    <BaseItem 
      v-for="item in items" 
      :key="item.id" 
      :initialText="item.title"
      :itemId="item.id"
      @edit="handleEdit"
    >
      {{ item.title }}
    </BaseItem>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from './BaseCard.vue';
import BaseItem from './BaseItem.vue';

interface ProjectItem {
  id: string;
  title: string;
}

interface Props {
  items: ProjectItem[];
  onCreate: (item: ProjectItem) => void;
  onEdit: (id: string, newTitle: string) => void;
}

const props = defineProps<Props>();

const handleCreate = () => {
  // This will be handled by the BaseCard's inline input
};

const handleNewItem = (text: string) => {
  const newItem: ProjectItem = {
    id: Date.now().toString(),
    title: text
  };
  props.onCreate(newItem);
};

const handleEdit = (newTitle: string, itemId?: string) => {
  if (itemId) {
    props.onEdit(itemId, newTitle);
  }
};
</script>
