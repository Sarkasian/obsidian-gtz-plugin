<template>
  <BaseCard title="Waiting For" :onCreate="onCreate">
    <BaseItem v-for="item in items" :key="item.id" :onClick="() => onEdit(item)">
      {{ item.title }}
    </BaseItem>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from './BaseCard.vue';
import BaseItem from './BaseItem.vue';
defineProps<{ items: any[], onCreate: () => void, onEdit: (item: any) => void }>();
</script>
