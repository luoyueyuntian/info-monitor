<template>
  <section class="flex flex-wrap items-center gap-3">
    <button class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50" @click="scrollToNamedSection('analysis')">分析</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50" @click="scrollToNamedSection('trend')">趋势</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50" @click="scrollToNamedSection('compare')">快照</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50" @click="scrollToNamedSection('sources')">来源</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50" @click="scrollToNamedSection('records')">记录</button>
    <button class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-4 py-2.5 text-[#1d1d1d] transition-colors hover:bg-slate-50" @click="scrollToNamedSection('timeline')">时间线</button>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  scrollToNamedSection: (sectionId: string) => void;
}>();
</script>
