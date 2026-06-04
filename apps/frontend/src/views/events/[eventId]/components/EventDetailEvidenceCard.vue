<template>
  <article class="card">
    <h3>证据链</h3>
    <div class="flex flex-col gap-3">
      <div v-for="item in evidence" :key="item" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
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
