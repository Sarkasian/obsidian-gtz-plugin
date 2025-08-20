<template>
  <div class="gtd-card">
    <div class="mod-card-section">
      <h3 class="mod-card-title">{{ title }}</h3>
      <div class="mod-scrollable" style="max-height: 350px;">
        <slot />
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
        <button class="mod-cta" @click="onCreate">+ New</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string, onCreate: () => void }>();
</script>