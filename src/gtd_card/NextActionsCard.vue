<template>
  <BaseCard title="Next Actions" :onCreate="onCreate">
    <BaseItem v-for="item in items" :key="item.id" :onClick="() => onEdit(item)">
      {{ item.title }}
      <span v-if="item.waitingForWarning" title="This task is #waiting-for but missing waitingOn field">&#9888;</span>
    </BaseItem>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from './BaseCard.vue';
import BaseItem from './BaseItem.vue';
defineProps<{ items: any[], onCreate: () => void, onEdit: (item: any) => void }>();
</script>
