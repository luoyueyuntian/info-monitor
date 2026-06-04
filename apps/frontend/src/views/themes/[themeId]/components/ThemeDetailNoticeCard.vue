<template>
  <article class="card">
    <strong>{{ title }}</strong>
    <p class="section-description">{{ body }}</p>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  body: string;
}>();
</script>
