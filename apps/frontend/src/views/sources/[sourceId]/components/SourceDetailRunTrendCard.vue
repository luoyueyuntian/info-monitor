<template>
  <article class="card" v-if="runCount">
    <div class="card-topline">
      <h3>运行趋势</h3>
      <span class="meta">最近 {{ runCount }} 次运行</span>
    </div>

    <div class="breakdown-grid">
      <div class="breakdown-item">
        <strong>成功率</strong>
        <div class="breakdown-count">{{ successRateLabel }}</div>
      </div>
      <div class="breakdown-item">
        <strong>成功次数</strong>
        <div class="breakdown-count">{{ completedCount }}</div>
      </div>
      <div class="breakdown-item">
        <strong>失败次数</strong>
        <div class="breakdown-count">{{ failedCount }}</div>
      </div>
      <div class="breakdown-item">
        <strong>待运行/运行中</strong>
        <div class="breakdown-count">{{ openCount }}</div>
      </div>
    </div>

    <div class="run-trend-strip">
      <div
        v-for="item in runSequenceItems"
        :key="item.id"
        class="run-trend-item"
      >
        <div class="run-trend-label">{{ item.label }}</div>
        <div class="run-trend-bar" :class="runBarClass(item.status)"></div>
        <div class="run-trend-status">{{ runStatusLabel(item.status) }}</div>
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
