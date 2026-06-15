<template>
  <article class="rounded-[22px] border border-slate-400/15 bg-white/84 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[#54708c]">Stock Investigation</div>
        <h3 class="mt-1 text-[1.02rem] font-semibold text-ink-heading">{{ title }}</h3>
      </div>
    </div>
    <p class="mt-3 text-[0.92rem] leading-7 text-ink-body">{{ summary }}</p>
    <div class="mt-4 flex flex-wrap gap-2.5">
      <RouterLink
        v-for="action in actions"
        :key="action.label"
        class="rounded-xl border border-slate-400/15 bg-slate-50/90 px-3.5 py-2 text-[0.86rem] font-semibold text-slate-700 transition-colors hover:bg-white"
        :to="action.to"
      >
        {{ action.label }}
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

defineProps<{
  title: string;
  summary: string;
  actions: Array<{ label: string; to: RouteLocationRaw }>;
}>();
</script>
