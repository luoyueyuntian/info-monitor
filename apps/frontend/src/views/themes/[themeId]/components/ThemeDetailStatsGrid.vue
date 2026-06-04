<template>
  <section class="stat-grid">
    <article class="stat-card">
      <span class="stat-label">主题类型</span>
      <span class="stat-value">{{ themeTypeLabel(themeType) }}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">记录数</span>
      <span class="stat-value">{{ recordCount }}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">来源数</span>
      <span class="stat-value">{{ sourceCount }}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">事件数</span>
      <span class="stat-value">{{ eventCount }}</span>
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
