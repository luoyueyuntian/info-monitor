<template>
  <section class="flex flex-col gap-5">
    <EventWorkbenchHeader />
    <EventWorkbenchBoard />
  </section>
</template>

<script setup lang="ts">
import EventWorkbenchBoard from "./components/EventWorkbenchBoard.vue";
import EventWorkbenchHeader from "./components/EventWorkbenchHeader.vue";
</script>
