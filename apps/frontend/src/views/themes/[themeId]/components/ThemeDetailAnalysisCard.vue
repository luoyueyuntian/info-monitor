<template>
  <article class="card">
    <div class="card-topline">
      <h3>分析与建议</h3>
      <span :class="pillToneClass(analysis.tone)">{{ analysisToneLabel(analysis.tone) }}</span>
      <span :class="stanceClass(analysis.stance)">{{ stanceLabel(analysis.stance) }}</span>
    </div>
    <p class="mb-3.5 text-[#6e665a]">{{ analysis.headline }}</p>
    <div class="text-ink-body">{{ analysis.summary }}</div>

    <!-- Price Judgment -->
    <div v-if="analysis.priceJudgment" class="rounded-2xl border border-amber-300/30 bg-amber-50/90 px-4 py-3.5">
      <strong>买入判断</strong>
      <div class="mt-2 flex items-center gap-3">
        <span :class="priceJudgmentClass(analysis.priceJudgment.level)">
          {{ analysis.priceJudgment.label }}
        </span>
        <span v-if="analysis.priceJudgment.trustHint" class="text-[0.86rem] text-amber-700">
          {{ analysis.priceJudgment.trustHint }}
        </span>
      </div>
      <div v-if="analysis.priceJudgment.reason" class="mt-2 text-[0.84rem] text-amber-600">
        {{ analysis.priceJudgment.reason }}
      </div>
      <!-- Trust Score Indicator -->
      <div v-if="analysis.priceJudgment.trustScore != null" class="mt-2 flex items-center gap-2">
        <span class="text-[0.82rem] text-slate-600">价格可信度:</span>
        <span :class="trustScoreClass(analysis.priceJudgment.trustScore)">
          {{ analysis.priceJudgment.trustScore }}/100
        </span>
        <span v-if="analysis.priceJudgment.riskLevel" :class="riskLevelClass(analysis.priceJudgment.riskLevel)">
          {{ riskLevelLabel(analysis.priceJudgment.riskLevel) }}
        </span>
      </div>
    </div>

    <!-- Conflicting Signals Warning (Task 7) -->
    <div v-if="analysis.hasConflictingSignals" class="rounded-2xl border border-amber-300/30 bg-amber-50/90 px-4 py-3.5">
      <strong class="text-amber-800">⚠ 方向矛盾信号</strong>
      <p class="mt-1 text-[0.86rem] text-amber-700">近期同时存在看多和看空信号，建议谨慎判断。</p>
    </div>

    <!-- Signal Accumulation -->
    <div v-if="analysis.signalAccumulation" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
      <strong>信号积累</strong>
      <div class="mt-2 flex flex-wrap gap-3 text-[0.88rem]">
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
          看多 {{ analysis.signalAccumulation.bullish }}
          <span v-if="analysis.signalAccumulation.recentBullish > 0" class="text-[0.78rem]">(+{{ analysis.signalAccumulation.recentBullish }} 24h)</span>
        </span>
        <span class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-rose-700">
          看空 {{ analysis.signalAccumulation.bearish }}
          <span v-if="analysis.signalAccumulation.recentBearish > 0" class="text-[0.78rem]">(+{{ analysis.signalAccumulation.recentBearish }} 24h)</span>
        </span>
        <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
          中性 {{ analysis.signalAccumulation.neutral }}
        </span>
      </div>
      <!-- Recent Streak (Task 7) -->
      <div v-if="analysis.recentStreak && analysis.recentStreak.direction !== 'none' && analysis.recentStreak.direction !== 'mixed'" class="mt-2 text-[0.86rem]">
        <span :class="analysis.recentStreak.direction === 'bullish' ? 'text-emerald-600' : 'text-rose-600'">
          近期连续 {{ analysis.recentStreak.count }} 个{{ analysis.recentStreak.direction === 'bullish' ? '看多' : '看空' }}信号
        </span>
      </div>
    </div>

    <!-- Supporting / Conflicting Sources -->
    <div v-if="(analysis.supportingSources?.length ?? 0) > 0 || (analysis.conflictingSources?.length ?? 0) > 0" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
      <div class="grid two">
        <div v-if="(analysis.supportingSources?.length ?? 0) > 0">
          <strong class="text-emerald-700">支撑来源</strong>
          <div class="mt-1.5 grid gap-1">
            <div v-for="item in analysis.supportingSources" :key="item" class="text-[0.86rem] text-emerald-600">{{ item }}</div>
          </div>
        </div>
        <div v-if="(analysis.conflictingSources?.length ?? 0) > 0">
          <strong class="text-rose-700">冲突来源</strong>
          <div class="mt-1.5 grid gap-1">
            <div v-for="item in analysis.conflictingSources" :key="item" class="text-[0.86rem] text-rose-600">{{ item }}</div>
          </div>
        </div>
      </div>
    </div>

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
import type { ThemeStance } from "@info-monitor/shared-contracts";
import type { RouteLocationRaw } from "vue-router";
import { pillToneClass } from "../../../../lib/presentation";

defineProps<{
  analysis: ThemeAnalysis;
  analysisToneLabel: (tone: string) => string;
  reviewActions: Array<{ label: string; to: RouteLocationRaw }>;
}>();

function stanceLabel(stance: ThemeStance): string {
  switch (stance) {
    case "bullish": return "偏多";
    case "bearish": return "偏空";
    case "watch": return "观察";
    default: return "中性";
  }
}

function stanceClass(stance: ThemeStance): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.8rem] font-semibold";
  switch (stance) {
    case "bullish": return `${base} bg-emerald-100 text-emerald-800`;
    case "bearish": return `${base} bg-rose-100 text-rose-800`;
    case "watch": return `${base} bg-amber-100 text-amber-800`;
    default: return `${base} bg-slate-100 text-slate-600`;
  }
}

function priceJudgmentClass(level: string): string {
  const base = "inline-flex items-center rounded-full px-3 py-1 text-[0.86rem] font-semibold";
  switch (level) {
    case "worth_buying": return `${base} bg-emerald-100 text-emerald-800`;
    case "worth_waiting": return `${base} bg-amber-100 text-amber-800`;
    case "worth_attention": return `${base} bg-blue-100 text-blue-800`;
    default: return `${base} bg-slate-100 text-slate-600`;
  }
}

function trustScoreClass(score: number): string {
  if (score >= 70) return "text-emerald-600 font-semibold";
  if (score >= 40) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

function riskLevelClass(level: string): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[0.78rem] font-semibold";
  switch (level) {
    case "likely_valid": return `${base} bg-emerald-100 text-emerald-700`;
    case "suspicious": return `${base} bg-amber-100 text-amber-700`;
    case "high_risk": return `${base} bg-red-100 text-red-700`;
    default: return `${base} bg-slate-100 text-slate-600`;
  }
}

function riskLevelLabel(level: string): string {
  switch (level) {
    case "likely_valid": return "较可信";
    case "suspicious": return "需验证";
    case "high_risk": return "高风险";
    default: return level;
  }
}
</script>
