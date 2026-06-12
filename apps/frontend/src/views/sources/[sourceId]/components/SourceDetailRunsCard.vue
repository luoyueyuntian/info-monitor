<template>
  <article class="card">
    <h3>最近运行</h3>
    <div class="flex flex-col gap-3">
      <div v-for="run in runs" :key="run.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass(run.status)">{{ runStatusLabel(run.status) }}</span>
          <span :class="pillToneClass()">{{ run.triggerType }}</span>
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-ink-secondary">开始: {{ formatDateTimeLabel(run.startedAt) }}</span>
          <span class="text-[0.88rem] text-ink-secondary">结束: {{ formatDateTimeLabel(run.finishedAt) }}</span>
        </div>
        <div v-if="run.errorMessage" class="text-ink-body">错误: {{ run.errorMessage }}</div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { SourceDetail } from "../../../../lib/api";
import { formatDateTimeLabel, pillToneClass, runStatusLabel } from "../../../../lib/presentation";

defineProps<{
  runs: SourceDetail["runs"];
}>();
</script>
