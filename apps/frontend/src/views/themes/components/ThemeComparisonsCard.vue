<template>
  <article class="card">
    <div class="card-topline">
      <h3>横向对比</h3>
      <span class="text-[0.88rem] text-ink-secondary">按主题类型挑出当前最值得优先跟进的对象</span>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <article
        v-for="item in items"
        :key="item.type"
        class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
      >
        <strong>{{ item.label }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2" v-if="item.theme">
          <span :class="pillToneClass(item.theme.sourceHealth)">
            {{ sourceHealthLabel(item.theme.sourceHealth) }}
          </span>
          <span
            :class="pillToneClass(themeImpactTone(item.theme))"
            v-if="item.theme.latestEventSignal"
          >
            {{ themeImpactTone(item.theme) === "negative" ? "偏利空" : themeImpactTone(item.theme) === "positive" ? "偏利好" : "中性" }}
          </span>
          <span
            :class="pillToneClass(item.theme.latestEventSignal)"
            v-if="item.theme.latestEventSignal"
          >
            {{ eventSignalLabel(item.theme.latestEventSignal) }}
          </span>
        </div>
        <div class="font-semibold text-[#1f2937]">
          {{ item.theme ? item.theme.name : "当前筛选下暂无该类型主题" }}
        </div>
        <div class="text-[0.88rem] text-ink-secondary">{{ item.summary }}</div>
        <div v-if="item.theme" class="mt-2 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="comparisonTarget(item)"
          >
            {{ comparisonActionLabel(item) }}
          </RouterLink>
          <RouterLink
            v-if="item.theme.type === 'price' && item.theme.sourceCount > 1"
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: `/themes/${item.theme.id}`, query: { section: 'compare' } }"
          >
            查看价格快照
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: '/events', query: { themeId: item.theme.id, impact: themeImpactTone(item.theme) !== 'neutral' ? themeImpactTone(item.theme) : undefined, sort: (item.theme.openEventCount ?? 0) > 0 ? 'statusChanged' : 'occurredAt' } }"
          >
            查看相关事件
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: '/sources/status', query: { themeId: item.theme.id, focus: item.theme.sourceHealth === 'warning' ? 'warning' : undefined } }"
          >
            查看来源状态
          </RouterLink>
        </div>
      </article>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import type { ThemeSummary } from "../../../lib/api";
import { themeImpactTone } from "../../../lib/impact";
import { eventSignalLabel, pillToneClass, sourceHealthLabel } from "../../../lib/presentation";

defineProps<{
  items: Array<{
    type: string;
    label: string;
    theme: ThemeSummary | null;
    summary: string;
  }>;
  comparisonTarget: (item: { theme: ThemeSummary | null }) => RouteLocationRaw;
  comparisonActionLabel: (item: { theme: ThemeSummary | null }) => string;
}>();
</script>
