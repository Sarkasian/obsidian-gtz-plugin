<template>
  <div class="gtd-card-item" @click="onClick">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ onClick: () => void }>();
</script>
