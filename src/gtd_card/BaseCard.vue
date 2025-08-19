<template>
  <div class="mod-card base-card">
    <div class="mod-card-section">
      <div class="base-card-header">
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