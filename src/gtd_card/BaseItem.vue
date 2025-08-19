<template>
  <div class="mod-card-section base-item-card">
    <slot />
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.base-item-card {
  background: var(--background-primary);
  border: 1.5px solid var(--background-modifier-border);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: box-shadow 0.15s;
}
.base-item-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}
</style>
