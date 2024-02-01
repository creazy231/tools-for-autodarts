<template>
  <div class="m-4 text-center">
    <h1 class="pb-6 text-3xl font-bold underline">
      Hello world from Options!
    </h1>

    <RouterLink to="/about">
      About
    </RouterLink>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
