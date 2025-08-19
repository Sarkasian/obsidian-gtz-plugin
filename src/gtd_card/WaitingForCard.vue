<template>
  <BaseCard
    title="Waiting For"
    :items="items"
    :onCreate="onCreate"
    :onEdit="onEdit"
  >
    <template #item="{ item }">
      {{ item.title }}
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from './BaseCard.vue';
defineProps<{ items: any[], onCreate: () => void, onEdit: (item: any) => void }>();
</script>
