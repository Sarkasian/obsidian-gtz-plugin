<template>
  <div id="app">
    <h1 class="mod-card-title">Obsidian Sample Plugin Homepage</h1>
    <div class="cards" style="display: flex; gap: 2rem; margin-top: 2rem;">
      <InboxCountCard />
      <RandomZettelCard />
      <GtdRegistryCard />
    </div>
  </div>
</template>

<script setup lang="ts">
import RandomZettelCard from './RandomZettelCard.vue';
import GtdRegistryCard from './GtdRegistryCard.vue';
</script>