<template>
  <div class="gtd-homepage-grid">
    <slot />
  </div>
</template>

<script setup lang="ts">
// No props yet; cards will be slotted in
</script>

<style scoped>
.gtd-homepage-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 1.5rem;
}
</style>
