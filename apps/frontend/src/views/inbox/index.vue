<template>
  <section class="flex flex-col gap-5">
    <HomeInboxHeader />
    <HomeInboxBoard />
  </section>
</template>

<script setup lang="ts">
import HomeInboxBoard from "./components/HomeInboxBoard.vue";
import HomeInboxHeader from "./components/HomeInboxHeader.vue";
</script>
