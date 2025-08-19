<template>
  <div class="mod-card-section mod-clickable" @click="onClick">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ onClick: () => void }>();
</script>
