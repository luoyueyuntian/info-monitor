<template>
  <section class="stat-grid">
    <RouterLink
      class="stat-card"
      :to="{ path: '/themes', query: { sort: 'priority' } }"
    >
      <span class="stat-label">活跃主题</span>
      <span class="stat-value">{{ summary.activeThemes }}</span>
      <span v-if="summaryDeltaLabel('activeThemes')" class="stat-delta">
        {{ summaryDeltaLabel("activeThemes") }}
      </span>
      <span class="stat-meta">先看当前最值得优先处理的主题</span>
    </RouterLink>
    <RouterLink
      class="stat-card"
      :to="{ path: '/events', query: { status: 'open', sort: 'statusChanged' } }"
    >
      <span class="stat-label">待处理事件</span>
      <span class="stat-value">{{ summary.openEvents }}</span>
      <button
        v-if="summaryDeltaTarget('openEvents')"
        type="button"
        class="stat-delta stat-delta-link"
        @click.stop.prevent="openSummaryDelta('openEvents')"
      >
        {{ summaryDeltaLabel("openEvents") }}
      </button>
      <span v-else-if="summaryDeltaLabel('openEvents')" class="stat-delta">
        {{ summaryDeltaLabel("openEvents") }}
      </span>
      <span class="stat-meta">直接进入事件工作台清待处理队列</span>
    </RouterLink>
    <RouterLink
      class="stat-card"
      :to="{ path: '/events', query: { status: 'tracking', sort: 'statusChanged' } }"
    >
      <span class="stat-label">关注中事件</span>
      <span class="stat-value">{{ summary.trackingEvents }}</span>
      <button
        v-if="summaryDeltaTarget('trackingEvents')"
        type="button"
        class="stat-delta stat-delta-link"
        @click.stop.prevent="openSummaryDelta('trackingEvents')"
      >
        {{ summaryDeltaLabel("trackingEvents") }}
      </button>
      <span v-else-if="summaryDeltaLabel('trackingEvents')" class="stat-delta">
        {{ summaryDeltaLabel("trackingEvents") }}
      </span>
      <span class="stat-meta">回看已经进入持续跟进的事件</span>
    </RouterLink>
    <RouterLink
      class="stat-card"
      :to="{ path: '/events', query: { recent: '24h', sort: 'occurredAt' } }"
    >
      <span class="stat-label">最近24小时事件</span>
      <span class="stat-value">{{ summary.recentEvents }}</span>
      <button
        v-if="summaryDeltaTarget('recentEvents')"
        type="button"
        class="stat-delta stat-delta-link"
        @click.stop.prevent="openSummaryDelta('recentEvents')"
      >
        {{ summaryDeltaLabel("recentEvents") }}
      </button>
      <span v-else-if="summaryDeltaLabel('recentEvents')" class="stat-delta">
        {{ summaryDeltaLabel("recentEvents") }}
      </span>
      <span class="stat-meta">快速巡检本轮新增信号</span>
    </RouterLink>
    <RouterLink
      class="stat-card"
      :to="{ path: '/sources/status', query: { focus: 'warning' } }"
    >
      <span class="stat-label">异常来源</span>
      <span class="stat-value">{{ summary.warningSources }}</span>
      <button
        v-if="summaryDeltaTarget('warningSources')"
        type="button"
        class="stat-delta stat-delta-link"
        @click.stop.prevent="openSummaryDelta('warningSources')"
      >
        {{ summaryDeltaLabel("warningSources") }}
      </button>
      <span v-else-if="summaryDeltaLabel('warningSources')" class="stat-delta">
        {{ summaryDeltaLabel("warningSources") }}
      </span>
      <span class="stat-meta">优先排查抓取异常和失真来源</span>
    </RouterLink>
    <RouterLink
      class="stat-card"
      :to="{ path: '/sources/status', query: { focus: 'pending' } }"
    >
      <span class="stat-label">待运行来源</span>
      <span class="stat-value">{{ summary.pendingSources }}</span>
      <button
        v-if="summaryDeltaTarget('pendingSources')"
        type="button"
        class="stat-delta stat-delta-link"
        @click.stop.prevent="openSummaryDelta('pendingSources')"
      >
        {{ summaryDeltaLabel("pendingSources") }}
      </button>
      <span v-else-if="summaryDeltaLabel('pendingSources')" class="stat-delta">
        {{ summaryDeltaLabel("pendingSources") }}
      </span>
      <span class="stat-meta">查看还没完成本轮抓取的来源</span>
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import type { DashboardSummary } from "../../../lib/api";

defineProps<{
  summary: DashboardSummary;
  summaryDeltaLabel: (key: keyof DashboardSummary) => string;
  summaryDeltaTarget: (key: keyof DashboardSummary) => RouteLocationRaw | null;
  openSummaryDelta: (key: keyof DashboardSummary) => void;
}>();
</script>
