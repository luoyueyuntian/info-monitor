<template>
  <article class="card">
    <div class="card-topline">
      <h3>横向对比</h3>
      <span class="text-[0.88rem] text-[#766f63]">按主题类型挑出当前最值得优先跟进的对象</span>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <RouterLink
        v-for="item in items"
        :key="item.type"
        class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        :to="comparisonTarget(item)"
      >
        <strong>{{ item.label }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2" v-if="item.theme">
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
        <div class="font-semibold text-[#1f2937]">
          {{ item.theme ? item.theme.name : "当前筛选下暂无该类型主题" }}
        </div>
        <div class="text-[0.88rem] text-[#766f63]">{{ item.summary }}</div>
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
