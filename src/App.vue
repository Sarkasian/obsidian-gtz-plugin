<template>
  <div id="app">
    <h1>Obsidian Sample Plugin Homepage</h1>
    <div class="cards">
      <InboxCountCard />
      <RandomZettelCard />
      <GtdRegistryCard />
    </div>
  </div>
</template>

<script setup lang="ts">
import InboxCountCard from './InboxCountCard.vue';
import RandomZettelCard from './RandomZettelCard.vue';
import GtdRegistryCard from './GtdRegistryCard.vue';
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  padding: 2rem;
}
.cards {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
}
</style>
