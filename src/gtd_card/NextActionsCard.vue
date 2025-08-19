<template>
  <BaseCard
    title="Next Actions"
    :items="items"
    :onCreate="onCreate"
    :onEdit="onEdit"
  >
    <template #item="{ item }">
      {{ item.title }}
      <span v-if="item.waitingForWarning" class="gtd-warning" title="This task is #waiting-for but missing waitingOn field">&#9888;</span>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from './BaseCard.vue';
defineProps<{ items: any[], onCreate: () => void, onEdit: (item: any) => void }>();
</script>

<style scoped>
.gtd-warning {
  color: var(--color-orange);
  margin-left: 0.5em;
  font-size: 1.2em;
  vertical-align: middle;
}
</style>
