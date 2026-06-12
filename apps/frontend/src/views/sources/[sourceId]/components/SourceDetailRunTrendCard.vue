<template>
  <article class="card" v-if="runCount">
    <div class="card-topline">
      <h3>运行趋势</h3>
      <span class="text-[0.88rem] text-ink-secondary">最近 {{ runCount }} 次运行</span>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>成功率</strong>
        <div class="text-[1.35rem] font-bold text-[#3f311d]">{{ successRateLabel }}</div>
      </div>
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>成功次数</strong>
        <div class="text-[1.35rem] font-bold text-[#3f311d]">{{ completedCount }}</div>
      </div>
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>失败次数</strong>
        <div class="text-[1.35rem] font-bold text-[#3f311d]">{{ failedCount }}</div>
      </div>
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>待运行/运行中</strong>
        <div class="text-[1.35rem] font-bold text-[#3f311d]">{{ openCount }}</div>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(64px,1fr))] gap-3">
      <div
        v-for="item in runSequenceItems"
        :key="item.id"
        class="grid justify-items-center gap-2"
      >
        <div class="text-center text-[0.8rem] text-slate-500">{{ item.label }}</div>
        <div class="h-3 w-full rounded-full bg-slate-300/90" :class="runBarClass(item.status)"></div>
        <div class="text-center text-[0.8rem] text-slate-500">{{ runStatusLabel(item.status) }}</div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { runStatusLabel } from "../../../../lib/presentation";

defineProps<{
  runCount: number;
  successRateLabel: string;
  completedCount: number;
  failedCount: number;
  openCount: number;
  runSequenceItems: Array<{ id: string; label: string; status: string }>;
  runBarClass: (status: string) => string;
}>();
</script>
