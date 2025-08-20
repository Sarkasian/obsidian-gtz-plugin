<template>
  <BaseCard title="Next Actions" :onCreate="handleCreate" @new-item="handleNewItem">
    <BaseItem 
      v-for="item in items" 
      :key="item.id" 
      :initialText="item.title"
      :itemId="item.id"
      @edit="handleEdit"
    >
      {{ item.title }}
      <span v-if="item.waitingForWarning" class="gtd-warning" title="This task is #waiting-for but missing waitingOn field">&#9888;</span>
    </BaseItem>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from './BaseCard.vue';
import BaseItem from './BaseItem.vue';

interface NextActionItem {
  id: string;
  title: string;
  waitingForWarning?: boolean;
}

interface Props {
  items: NextActionItem[];
  onCreate: (item: NextActionItem) => void;
  onEdit: (id: string, newTitle: string) => void;
}

const props = defineProps<Props>();

const handleCreate = () => {
  // This will be handled by the BaseCard's inline input
};

const handleNewItem = (text: string) => {
  const newItem: NextActionItem = {
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
