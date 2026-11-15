<template>
  <section class="flex flex-wrap items-center gap-3">
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('content')">采集内容</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('analysis')">分析</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('trend')">趋势</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('compare')">快照</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('continuous-snapshot')">连续快照</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('financial-rhythm')">节奏</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('sources')">来源</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('records')">采集字段</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('timeline')">时间线</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50" @click="scrollToNamedSection('review-note')">笔记</button>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  scrollToNamedSection: (sectionId: string) => void;
}>();
</script>
