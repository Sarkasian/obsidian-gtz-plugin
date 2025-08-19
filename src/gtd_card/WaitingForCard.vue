<template>
  <BaseCard
    title="Waiting For"
    :items="items"
    :onCreate="onCreate"
    :onEdit="onEdit"
  >
    <template #item="{ item }">
      <BaseItem>
        {{ item.title }}
      </BaseItem>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from './BaseCard.vue';
import BaseItem from './BaseItem.vue';
defineProps<{ items: any[], onCreate: () => void, onEdit: (item: any) => void }>();
</script>
