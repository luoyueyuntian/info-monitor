<template>
  <article class="card">
    <h3>最近运行</h3>
    <div class="list">
      <div v-for="run in runs" :key="run.id" class="list-item">
        <div class="theme-topline">
          <span :class="pillToneClass(run.status)">{{ runStatusLabel(run.status) }}</span>
          <span class="pill">{{ run.triggerType }}</span>
        </div>
        <div class="meta-row">
          <span class="meta">开始: {{ formatDateTimeLabel(run.startedAt) }}</span>
          <span class="meta">结束: {{ formatDateTimeLabel(run.finishedAt) }}</span>
        </div>
        <div v-if="run.errorMessage" class="muted">错误: {{ run.errorMessage }}</div>
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
