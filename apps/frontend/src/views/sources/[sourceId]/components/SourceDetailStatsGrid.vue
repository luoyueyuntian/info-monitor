<template>
  <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">主题</span>
      <span class="text-[1.2rem] font-bold text-ink-heading">{{ themeName }}</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">来源类型</span>
      <span class="text-[1.2rem] font-bold text-ink-heading">{{ sourceTypeLabel(sourceType) }}</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">最近运行</span>
      <span class="text-[1.2rem] font-bold text-ink-heading">{{ runStatusLabel(latestRunStatus) }}</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">状态</span>
      <span class="text-[1.2rem] font-bold text-ink-heading">{{ sourceStatusLabel(status) }}</span>
    </article>
  </section>
</template>

<script setup lang="ts">
import { runStatusLabel, sourceStatusLabel, sourceTypeLabel } from "../../../../lib/presentation";

defineProps<{
  themeName: string;
  sourceType?: string;
  latestRunStatus?: string | null;
  status: string;
}>();
</script>
