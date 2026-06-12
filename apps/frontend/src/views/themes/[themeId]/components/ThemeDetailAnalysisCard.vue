<template>
  <article class="card">
    <div class="card-topline">
      <h3>分析与建议</h3>
      <span :class="pillToneClass(analysis.tone)">{{ analysisToneLabel(analysis.tone) }}</span>
    </div>
    <p class="mb-3.5 text-[#6e665a]">{{ analysis.headline }}</p>
    <div class="text-ink-body">{{ analysis.summary }}</div>

    <div class="grid two">
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>当前判断</strong>
        <div class="mt-2.5 grid gap-2">
          <div v-for="item in analysis.keyPoints" :key="`point-${item}`" class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]">
            {{ item }}
          </div>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>风险提醒</strong>
        <div class="mt-2.5 grid gap-2">
          <div v-for="item in analysis.risks" :key="`risk-${item}`" class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]">
            {{ item }}
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
      <strong>建议动作</strong>
      <div class="mt-2.5 grid gap-2">
        <div v-for="item in analysis.actions" :key="`action-${item}`" class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]">
          {{ item }}
        </div>
      </div>
    </div>

    <div v-if="reviewActions.length" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
      <strong>复盘入口</strong>
      <div class="mt-2.5 grid gap-2">
        <RouterLink
          v-for="action in reviewActions"
          :key="action.label"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 font-semibold leading-6 text-slate-700 transition-colors hover:bg-white/90"
          :to="action.to"
        >
          {{ action.label }}
        </RouterLink>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
      <strong>近期变化</strong>
      <div class="text-ink-body">{{ analysis.recentChange.headline }}</div>
      <div class="mb-0 mt-2 text-[#6e665a]">{{ analysis.recentChange.summary }}</div>
      <div class="mt-2.5 grid gap-2">
        <div
          v-for="item in analysis.recentChange.highlights"
          :key="`recent-${item}`"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]"
        >
          {{ item }}
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
      <strong>趋势判断</strong>
      <div class="text-ink-body">{{ analysis.trend.headline }}</div>
      <div class="mb-0 mt-2 text-[#6e665a]">{{ analysis.trend.summary }}</div>
      <div class="mt-2.5 grid gap-2">
        <div
          v-for="item in analysis.trend.highlights"
          :key="`trend-${item}`"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 leading-6 text-[#4b5563]"
        >
          {{ item }}
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeAnalysis } from "../../../../lib/api";
import type { RouteLocationRaw } from "vue-router";
import { pillToneClass } from "../../../../lib/presentation";

defineProps<{
  analysis: ThemeAnalysis;
  analysisToneLabel: (tone: string) => string;
  reviewActions: Array<{ label: string; to: RouteLocationRaw }>;
}>();
</script>
