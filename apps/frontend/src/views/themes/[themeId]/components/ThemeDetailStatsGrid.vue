<template>
  <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">主题类型</span>
      <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ themeTypeLabel(themeType) }}</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">记录数</span>
      <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ recordCount }}</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">来源数</span>
      <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ sourceCount }}</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">事件数</span>
      <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ eventCount }}</span>
    </article>
  </section>
</template>

<script setup lang="ts">
import { themeTypeLabel } from "../../../../lib/presentation";

defineProps<{
  themeType: string;
  recordCount: number;
  sourceCount: number;
  eventCount: number;
}>();
</script>
