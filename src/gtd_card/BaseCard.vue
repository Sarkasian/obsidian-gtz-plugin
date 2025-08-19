<template>
  <div class="mod-card-section" style="flex: 1 1 0; min-width: 200px; max-width: 320px; display: flex; flex-direction: column;">
    <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 0.5rem;">
      <span>{{ title }}</span>
      <button class="mod-cta" @click="onCreate">+ New</button>
    </div>
    <div class="mod-scrollable" style="flex: 1 1 auto; overflow-y: auto; border-top: 1px solid var(--background-modifier-border); padding-top: 0.5rem; max-height: 350px;">
      <div v-for="item in items" :key="item.id" class="mod-clickable" style="padding: 0.5rem 0.25rem; border-bottom: 1px solid var(--background-modifier-border); cursor: pointer;" @click="() => onEdit(item)">
        <slot name="item" :item="item">{{ item.title }}</slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string,
  items: any[],
  onCreate: () => void,
  onEdit: (item: any) => void
}>();
</script>
