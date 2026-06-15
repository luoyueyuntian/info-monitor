<template>
  <article class="card">
    <div class="card-topline">
      <div>
        <h3>{{ data.headline }}</h3>
        <p class="m-0 mt-2 text-ink-body">{{ data.summary }}</p>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2.5">
      <span
        v-for="stat in data.stats"
        :key="stat"
        class="rounded-full border border-slate-400/15 bg-slate-50/90 px-3 py-1.5 text-[0.84rem] font-semibold text-[#5f574a]"
      >
        {{ stat }}
      </span>
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <section class="rounded-2xl border border-slate-400/15 bg-white/80 px-4 py-3.5">
        <strong class="text-[0.92rem] text-ink-heading">持续领先板块</strong>
        <div class="mt-3 grid gap-2">
          <div
            v-for="leader in data.leaders"
            :key="leader.code"
            class="flex items-center justify-between rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-2.5"
          >
            <div>
              <div class="font-semibold text-[#3b3b3b]">{{ leader.label }}</div>
              <div class="text-[0.8rem] text-ink-secondary">
                最近龙头 {{ leader.latestLeadingStockName ?? "--" }} · 上榜 {{ leader.appearances }} 次
              </div>
            </div>
            <div class="text-right">
              <div :class="numberToneClass(leader.latestNetInflowBillion)">
                {{ formatSignedAmount(leader.latestNetInflowBillion) }}
              </div>
              <div class="text-[0.78rem]" :class="numberToneClass(leader.latestChangePercent)">
                {{ formatSignedPercent(leader.latestChangePercent) }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-400/15 bg-white/80 px-4 py-3.5">
        <strong class="text-[0.92rem] text-ink-heading">最近每日领涨主线</strong>
        <div class="mt-3 grid gap-2">
          <div
            v-for="item in data.dailyLeaders"
            :key="`${item.date}-${item.label}`"
            class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-2.5"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold text-[#3b3b3b]">{{ item.label }}</div>
                <div class="text-[0.8rem] text-ink-secondary">{{ item.date }}</div>
              </div>
              <div class="text-right">
                <div :class="numberToneClass(item.netInflowBillion)">{{ formatSignedAmount(item.netInflowBillion) }}</div>
                <div class="text-[0.78rem]" :class="numberToneClass(item.changePercent)">{{ formatSignedPercent(item.changePercent) }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { MarketStructureTrendData } from "./theme-detail-market-structure";

defineProps<{
  data: MarketStructureTrendData;
}>();

function numberToneClass(value: number | null): string {
  if (value == null) {
    return "text-slate-500";
  }

  if (value > 0) {
    return "text-emerald-600";
  }

  if (value < 0) {
    return "text-rose-600";
  }

  return "text-slate-500";
}

function formatSignedPercent(value: number | null): string {
  if (value == null) {
    return "--";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSignedAmount(value: number | null): string {
  if (value == null) {
    return "--";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} 亿CNY`;
}
</script>
