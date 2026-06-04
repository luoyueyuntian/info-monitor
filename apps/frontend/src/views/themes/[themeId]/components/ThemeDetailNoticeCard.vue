<template>
  <article class="card">
    <strong>{{ title }}</strong>
    <p class="mb-3.5 text-[#6e665a]">{{ body }}</p>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  body: string;
}>();
</script>
