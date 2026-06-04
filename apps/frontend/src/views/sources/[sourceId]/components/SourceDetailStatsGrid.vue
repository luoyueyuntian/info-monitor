<template>
  <section class="stat-grid">
    <article class="stat-card">
      <span class="stat-label">主题</span>
      <span class="stat-value">{{ themeName }}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">来源类型</span>
      <span class="stat-value">{{ sourceTypeLabel(sourceType) }}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">最近运行</span>
      <span class="stat-value">{{ runStatusLabel(latestRunStatus) }}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">状态</span>
      <span class="stat-value">{{ sourceStatusLabel(status) }}</span>
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
