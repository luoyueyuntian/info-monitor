<template>
  <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <RouterLink class="grid gap-1.5 transition-colors hover:text-[#6b4f1f]" :to="{ path: '/themes', query: { sort: 'priority' } }">
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">活跃主题</span>
        <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ summary.activeThemes }}</span>
      </RouterLink>
      <span v-if="summaryDeltaLabel('activeThemes')" class="text-[0.82rem] font-semibold text-slate-500">
        {{ summaryDeltaLabel("activeThemes") }}
      </span>
      <span class="text-[0.88rem] leading-[1.45] text-slate-500">先看当前最值得优先处理的主题</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <RouterLink class="grid gap-1.5 transition-colors hover:text-[#6b4f1f]" :to="{ path: '/events', query: { status: 'open', sort: 'statusChanged' } }">
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">待处理事件</span>
        <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ summary.openEvents }}</span>
      </RouterLink>
      <button
        v-if="summaryDeltaTarget('openEvents')"
        type="button"
        class="cursor-pointer border-none bg-transparent p-0 text-left text-[0.82rem] font-semibold text-slate-500"
        @click.stop.prevent="openSummaryDelta('openEvents')"
      >
        {{ summaryDeltaLabel("openEvents") }}
      </button>
      <span v-else-if="summaryDeltaLabel('openEvents')" class="text-[0.82rem] font-semibold text-slate-500">
        {{ summaryDeltaLabel("openEvents") }}
      </span>
      <span class="text-[0.88rem] leading-[1.45] text-slate-500">直接进入事件工作台清待处理队列</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <RouterLink class="grid gap-1.5 transition-colors hover:text-[#6b4f1f]" :to="{ path: '/events', query: { status: 'tracking', sort: 'statusChanged' } }">
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">关注中事件</span>
        <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ summary.trackingEvents }}</span>
      </RouterLink>
      <button
        v-if="summaryDeltaTarget('trackingEvents')"
        type="button"
        class="cursor-pointer border-none bg-transparent p-0 text-left text-[0.82rem] font-semibold text-slate-500"
        @click.stop.prevent="openSummaryDelta('trackingEvents')"
      >
        {{ summaryDeltaLabel("trackingEvents") }}
      </button>
      <span v-else-if="summaryDeltaLabel('trackingEvents')" class="text-[0.82rem] font-semibold text-slate-500">
        {{ summaryDeltaLabel("trackingEvents") }}
      </span>
      <span class="text-[0.88rem] leading-[1.45] text-slate-500">回看已经进入持续跟进的事件</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <RouterLink class="grid gap-1.5 transition-colors hover:text-[#6b4f1f]" :to="{ path: '/events', query: { read: 'unread', sort: 'occurredAt' } }">
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">未读事件</span>
        <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ summary.unreadEvents }}</span>
      </RouterLink>
      <button
        v-if="summaryDeltaTarget('unreadEvents')"
        type="button"
        class="cursor-pointer border-none bg-transparent p-0 text-left text-[0.82rem] font-semibold text-slate-500"
        @click.stop.prevent="openSummaryDelta('unreadEvents')"
      >
        {{ summaryDeltaLabel("unreadEvents") }}
      </button>
      <span v-else-if="summaryDeltaLabel('unreadEvents')" class="text-[0.82rem] font-semibold text-slate-500">
        {{ summaryDeltaLabel("unreadEvents") }}
      </span>
      <span class="text-[0.88rem] leading-[1.45] text-slate-500">快速巡检还没读过的新线索</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <RouterLink class="grid gap-1.5 transition-colors hover:text-[#6b4f1f]" :to="{ path: '/events', query: { bookmark: 'bookmarked', sort: 'statusChanged' } }">
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">收藏事件</span>
        <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ summary.bookmarkedEvents }}</span>
      </RouterLink>
      <button
        v-if="summaryDeltaTarget('bookmarkedEvents')"
        type="button"
        class="cursor-pointer border-none bg-transparent p-0 text-left text-[0.82rem] font-semibold text-slate-500"
        @click.stop.prevent="openSummaryDelta('bookmarkedEvents')"
      >
        {{ summaryDeltaLabel("bookmarkedEvents") }}
      </button>
      <span v-else-if="summaryDeltaLabel('bookmarkedEvents')" class="text-[0.82rem] font-semibold text-slate-500">
        {{ summaryDeltaLabel("bookmarkedEvents") }}
      </span>
      <span class="text-[0.88rem] leading-[1.45] text-slate-500">沉淀值得长期回看的重点事件</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <RouterLink class="grid gap-1.5 transition-colors hover:text-[#6b4f1f]" :to="{ path: '/events', query: { recent: '24h', sort: 'occurredAt' } }">
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">最近24小时事件</span>
        <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ summary.recentEvents }}</span>
      </RouterLink>
      <button
        v-if="summaryDeltaTarget('recentEvents')"
        type="button"
        class="cursor-pointer border-none bg-transparent p-0 text-left text-[0.82rem] font-semibold text-slate-500"
        @click.stop.prevent="openSummaryDelta('recentEvents')"
      >
        {{ summaryDeltaLabel("recentEvents") }}
      </button>
      <span v-else-if="summaryDeltaLabel('recentEvents')" class="text-[0.82rem] font-semibold text-slate-500">
        {{ summaryDeltaLabel("recentEvents") }}
      </span>
      <span class="text-[0.88rem] leading-[1.45] text-slate-500">快速巡检本轮新增信号</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <RouterLink class="grid gap-1.5 transition-colors hover:text-[#6b4f1f]" :to="{ path: '/sources/status', query: { focus: 'warning' } }">
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">异常来源</span>
        <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ summary.warningSources }}</span>
      </RouterLink>
      <button
        v-if="summaryDeltaTarget('warningSources')"
        type="button"
        class="cursor-pointer border-none bg-transparent p-0 text-left text-[0.82rem] font-semibold text-slate-500"
        @click.stop.prevent="openSummaryDelta('warningSources')"
      >
        {{ summaryDeltaLabel("warningSources") }}
      </button>
      <span v-else-if="summaryDeltaLabel('warningSources')" class="text-[0.82rem] font-semibold text-slate-500">
        {{ summaryDeltaLabel("warningSources") }}
      </span>
      <span class="text-[0.88rem] leading-[1.45] text-slate-500">优先排查抓取异常和失真来源</span>
    </article>
    <article class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4">
      <RouterLink class="grid gap-1.5 transition-colors hover:text-[#6b4f1f]" :to="{ path: '/sources/status', query: { focus: 'pending' } }">
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">待运行来源</span>
        <span class="text-[1.2rem] font-bold text-[#2f2618]">{{ summary.pendingSources }}</span>
      </RouterLink>
      <button
        v-if="summaryDeltaTarget('pendingSources')"
        type="button"
        class="cursor-pointer border-none bg-transparent p-0 text-left text-[0.82rem] font-semibold text-slate-500"
        @click.stop.prevent="openSummaryDelta('pendingSources')"
      >
        {{ summaryDeltaLabel("pendingSources") }}
      </button>
      <span v-else-if="summaryDeltaLabel('pendingSources')" class="text-[0.82rem] font-semibold text-slate-500">
        {{ summaryDeltaLabel("pendingSources") }}
      </span>
      <span class="text-[0.88rem] leading-[1.45] text-slate-500">查看还没完成本轮抓取的来源</span>
    </article>
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
