<template>
  <article class="card">
    <h3>证据链</h3>
    <div class="list">
      <div v-for="item in evidence" :key="item" class="list-item">
        <strong>{{ item }}</strong>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  evidence: string[];
}>();
</script>
