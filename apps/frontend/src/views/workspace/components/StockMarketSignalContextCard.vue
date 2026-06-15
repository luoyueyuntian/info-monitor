<template>
  <article class="rounded-[22px] border border-slate-400/15 bg-white/84 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[#54708c]">Stock Context</div>
        <h3 class="mt-1 text-[1.02rem] font-semibold text-ink-heading">{{ title }}</h3>
      </div>
    </div>
    <p class="mt-3 text-[0.92rem] leading-7 text-ink-body">{{ summary }}</p>
    <ul v-if="bullets.length" class="mt-4 grid gap-2 pl-5 text-[0.9rem] leading-6 text-ink-body">
      <li v-for="item in bullets" :key="item">{{ item }}</li>
    </ul>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  summary: string;
  bullets: string[];
}>();
</script>
