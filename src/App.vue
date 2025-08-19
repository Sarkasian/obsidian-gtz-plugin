<template>
  <div id="app">
    <h1 class="mod-card-title">Obsidian Sample Plugin Homepage</h1>
    <div class="cards" style="display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem;">
      <GtdRegistryCard />
      <RandomZettelCard />
    </div>
  </div>
</template>

<script setup lang="ts">
import RandomZettelCard from './RandomZettelCard.vue';
import GtdRegistryCard from './gtd_card/GtdRegistryCard.vue';
</script>