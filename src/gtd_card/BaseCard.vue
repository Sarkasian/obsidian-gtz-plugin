<template>
  <div class="mod-card">
    <div class="mod-card-section">
      <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 0.5rem;">
        <span>{{ title }}</span>
        <button class="mod-cta" @click="onCreate">+ New</button>
      </div>
      <div class="mod-scrollable">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string, onCreate: () => void }>();
</script>