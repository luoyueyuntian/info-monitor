<script setup lang="ts">
defineProps<{
  title: string
  value: string
  signal: string
  description?: string
}>()

const signalColors: Record<string, string> = {
  bullish: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bearish: 'bg-rose-50 text-rose-700 border-rose-200',
  neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  overbought: 'bg-amber-50 text-amber-700 border-amber-200',
  oversold: 'bg-sky-50 text-sky-700 border-sky-200',
  golden_cross: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  death_cross: 'bg-rose-50 text-rose-700 border-rose-200',
  bullish_alignment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bearish_alignment: 'bg-rose-50 text-rose-700 border-rose-200',
  approaching_overbought: 'bg-amber-50 text-amber-700 border-amber-200',
  approaching_oversold: 'bg-sky-50 text-sky-700 border-sky-200',
  mixed: 'bg-slate-50 text-slate-700 border-slate-200',
  unknown: 'bg-slate-50 text-slate-700 border-slate-200',
  above_middle: 'bg-slate-50 text-slate-700 border-slate-200',
  below_middle: 'bg-slate-50 text-slate-700 border-slate-200',
}

const signalLabels: Record<string, string> = {
  bullish: '看涨',
  bearish: '看跌',
  neutral: '中性',
  overbought: '超买',
  oversold: '超卖',
  golden_cross: '金叉',
  death_cross: '死叉',
  bullish_alignment: '多头排列',
  bearish_alignment: '空头排列',
  approaching_overbought: '接近超买',
  approaching_oversold: '接近超卖',
  mixed: '震荡',
  unknown: '未知',
  above_middle: '中轨上方',
  below_middle: '中轨下方',
  above_upper: '突破上轨',
  below_lower: '突破下轨',
}
</script>

<template>
  <div class="rounded-2xl border border-slate-400/15 bg-white/70 p-4">
    <div class="flex items-center justify-between">
      <div class="text-[0.8rem] uppercase tracking-[0.08em] text-ink-label">{{ title }}</div>
      <span
        class="rounded-full border px-2 py-0.5 text-[0.76rem] font-semibold"
        :class="signalColors[signal] ?? signalColors.neutral"
      >
        {{ signalLabels[signal] ?? signal }}
      </span>
    </div>
    <div class="mt-2 text-[1.15rem] font-semibold text-ink-heading">{{ value }}</div>
    <p v-if="description" class="mt-1 text-[0.88rem] leading-6 text-ink-body">{{ description }}</p>
  </div>
</template>
