<template>
  <div class="gtd-card">
    <h3 class="gtd-card-title">{{ title }}</h3>
    <div class="gtd-card-content mod-scrollable" style="max-height: 350px;">
      <slot />
    </div>
    <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
      <button class="mod-cta" @click="onCreate">+ New</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string, onCreate: () => void }>();
</script>