<template>
  <article class="card">
    <div class="card-topline">
      <h3>趋势图</h3>
      <span class="text-[0.88rem] text-ink-secondary">
        {{ themeType === "price" ? "最近价格走势" : "最近事件活跃度" }}
      </span>
    </div>

    <template v-if="themeType === 'price' && priceTrendPoints.length > 1">
      <div class="mt-3 rounded-2xl border border-slate-400/15 bg-white/75 p-3">
        <svg viewBox="0 0 320 160" class="block h-auto w-full" role="img" aria-label="价格趋势图">
          <polyline
            :points="priceTrendPolyline"
            fill="none"
            stroke="#475569"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-for="point in priceTrendPoints"
            :key="`${point.label}-${point.value}`"
            :cx="point.x"
            :cy="point.y"
            r="3"
            fill="#475569"
          />
        </svg>
      </div>
      <div class="mt-3 flex flex-wrap gap-3">
        <span class="text-[0.88rem] text-ink-secondary">最低: {{ formatMaybeLabel(priceTrendMin) }}</span>
        <span class="text-[0.88rem] text-ink-secondary">最高: {{ formatMaybeLabel(priceTrendMax) }}</span>
        <span class="text-[0.88rem] text-ink-secondary">最新: {{ formatMaybeLabel(priceTrendLatest) }}</span>
      </div>
      <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
          <strong>相对低点</strong>
          <div class="text-[1.35rem] font-bold text-[#3f311d]">{{ priceVsMinLabel }}</div>
        </div>
        <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
          <strong>相对高点</strong>
          <div class="text-[1.35rem] font-bold text-[#3f311d]">{{ priceVsMaxLabel }}</div>
        </div>
        <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
          <strong>样本振幅</strong>
          <div class="text-[1.35rem] font-bold text-[#3f311d]">{{ priceRangeLabel }}</div>
        </div>
      </div>
      <div class="mt-2.5 flex justify-between gap-2">
        <span
          v-for="point in priceTrendPoints"
          :key="`axis-${point.label}`"
          class="text-[0.82rem] text-slate-500"
        >
          {{ point.label }}
        </span>
      </div>
    </template>

    <template v-else-if="eventActivityBars.length > 0">
      <div class="mt-3 grid grid-cols-[repeat(auto-fit,minmax(48px,1fr))] items-end gap-3">
        <div
          v-for="bar in eventActivityBars"
          :key="bar.label"
          class="grid justify-items-center gap-2"
        >
          <div class="text-[0.82rem] text-slate-600">{{ bar.count }}</div>
          <div class="flex min-h-[120px] w-full items-end overflow-hidden rounded-xl bg-slate-200/80">
            <div class="w-full rounded-t-xl bg-[linear-gradient(180deg,#94a3b8_0%,#64748b_100%)]" :style="{ height: `${bar.height}%` }"></div>
          </div>
          <div class="text-[0.8rem] text-slate-500">{{ bar.label }}</div>
        </div>
      </div>
    </template>
  </article>
</template>

<script setup lang="ts">
import { formatMaybeLabel } from "../../../../lib/presentation";

defineProps<{
  themeType: string;
  priceTrendPoints: Array<{ label: string; value: number; x: number; y: number }>;
  priceTrendPolyline: string;
  priceTrendMin: number | null;
  priceTrendMax: number | null;
  priceTrendLatest: number | null;
  priceVsMinLabel: string;
  priceVsMaxLabel: string;
  priceRangeLabel: string;
  eventActivityBars: Array<{ label: string; count: number; height: number }>;
}>();
</script>
