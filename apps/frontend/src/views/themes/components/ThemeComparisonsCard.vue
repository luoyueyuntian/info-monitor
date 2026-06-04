<template>
  <article class="card">
    <div class="card-topline">
      <h3>横向对比</h3>
      <span class="meta">按主题类型挑出当前最值得优先跟进的对象</span>
    </div>
    <div class="breakdown-grid">
      <RouterLink
        v-for="item in items"
        :key="item.type"
        class="breakdown-item comparison-card"
        :to="comparisonTarget(item)"
      >
        <strong>{{ item.label }}</strong>
        <div class="meta-row" v-if="item.theme">
          <span :class="pillToneClass(item.theme.sourceHealth)">
            {{ sourceHealthLabel(item.theme.sourceHealth) }}
          </span>
          <span
            :class="pillToneClass(item.theme.latestEventSignal)"
            v-if="item.theme.latestEventSignal"
          >
            {{ eventSignalLabel(item.theme.latestEventSignal) }}
          </span>
        </div>
        <div class="muted comparison-title">
          {{ item.theme ? item.theme.name : "当前筛选下暂无该类型主题" }}
        </div>
        <div class="meta">{{ item.summary }}</div>
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import type { ThemeSummary } from "../../../lib/api";
import { eventSignalLabel, pillToneClass, sourceHealthLabel } from "../../../lib/presentation";

defineProps<{
  items: Array<{
    type: string;
    label: string;
    theme: ThemeSummary | null;
    summary: string;
  }>;
  comparisonTarget: (item: { theme: ThemeSummary | null }) => RouteLocationRaw;
}>();
</script>
