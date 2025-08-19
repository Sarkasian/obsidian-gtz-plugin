<template>
  <div class="gtd-homepage-card">
    <h3>Inbox Count</h3>
    <div>Inbox items: 0 (demo)</div>
  </div>
</template>

<script setup lang="ts">
// In a real plugin, props or state would provide the count
</script>

<style scoped>
.gtd-homepage-card {
  background: var(--background-secondary-alt);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  padding: 1.25rem 1.5rem;
  min-width: 220px;
  max-width: 320px;
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.gtd-homepage-card h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.2rem;
  font-weight: 600;
}
</style>
