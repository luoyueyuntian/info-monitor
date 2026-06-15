<template>
  <article class="card">
    <div class="card-topline">
      <div>
        <h3>{{ marketOverview.headline }}</h3>
        <p class="m-0 mt-2 text-ink-body">{{ marketOverview.summary }}</p>
      </div>
    </div>

    <div v-if="marketOverview.crossMarketHighlights.length" class="mt-4 flex flex-wrap gap-2.5">
      <span
        v-for="item in marketOverview.crossMarketHighlights"
        :key="item"
        class="rounded-full border border-slate-400/15 bg-slate-50/90 px-3 py-1.5 text-[0.84rem] font-semibold text-[#5f574a]"
      >
        {{ item }}
      </span>
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-2">
      <section
        v-for="snapshot in marketOverview.snapshots"
        :key="snapshot.market"
        class="rounded-[24px] border border-slate-400/15 bg-slate-50/90 px-4 py-4"
      >
        <div class="flex flex-wrap items-center gap-2">
          <h4 class="m-0 text-[1rem] font-semibold text-ink-heading">{{ snapshot.marketLabel }}</h4>
          <span :class="toneClass(snapshot.tone)">{{ snapshot.directionLabel }}</span>
          <span class="text-[0.8rem] text-ink-secondary">{{ formatDateTime(snapshot.occurredAt) }}</span>
        </div>

        <div class="mt-2 text-[0.92rem] font-semibold text-[#3b3b3b]">{{ snapshot.headline }}</div>
        <div class="mt-1 text-[0.9rem] leading-6 text-[#5c5549]">{{ snapshot.summary }}</div>

        <div class="mt-3 grid gap-2 md:grid-cols-2">
          <div class="rounded-2xl border border-slate-400/15 bg-white/80 px-3.5 py-3">
            <div class="text-[0.78rem] uppercase tracking-[0.18em] text-slate-500">基准表现</div>
            <div class="mt-1 text-[1rem] font-semibold text-ink-heading">
              {{ snapshot.benchmarkName ?? "未设置基准" }}
            </div>
            <div class="mt-1 text-[0.9rem]" :class="numberToneClass(snapshot.benchmarkChangePercent)">
              {{ formatSignedPercent(snapshot.benchmarkChangePercent) }}
            </div>
          </div>

          <div class="rounded-2xl border border-slate-400/15 bg-white/80 px-3.5 py-3">
            <div class="text-[0.78rem] uppercase tracking-[0.18em] text-slate-500">资金流向</div>
            <div class="mt-1 text-[1rem] font-semibold text-ink-heading">
              {{ flowDirectionLabel(snapshot.fundFlowDirection) }}
            </div>
            <div class="mt-1 text-[0.9rem]" :class="numberToneClass(snapshot.fundFlowNetBillion)">
              {{ formatSignedAmount(snapshot.fundFlowNetBillion, snapshot.fundFlowCurrency) }}
            </div>
            <div class="mt-1 text-[0.8rem] text-ink-secondary">
              成交额 {{ formatAmount(snapshot.fundFlowTurnoverBillion, snapshot.fundFlowCurrency) }}
            </div>
          </div>
        </div>

        <div v-if="snapshot.indices.length" class="mt-3 rounded-2xl border border-slate-400/15 bg-white/80 px-3.5 py-3">
          <strong class="text-[0.92rem] text-ink-heading">主要指数</strong>
          <div class="mt-2 grid gap-2">
            <div
              v-for="index in snapshot.indices"
              :key="`${snapshot.market}-${index.code}`"
              class="flex items-center justify-between rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-2"
            >
              <div>
                <div class="text-[0.92rem] font-semibold text-[#3b3b3b]">{{ index.label }}</div>
                <div class="text-[0.8rem] text-ink-secondary">{{ index.code }}</div>
              </div>
              <div class="text-right">
                <div class="text-[0.9rem] font-semibold text-ink-heading">{{ formatLatest(index.latest) }}</div>
                <div class="text-[0.84rem]" :class="numberToneClass(index.changePercent)">
                  {{ formatSignedPercent(index.changePercent) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="snapshot.sectorFlows?.length" class="mt-3 rounded-2xl border border-slate-400/15 bg-white/80 px-3.5 py-3">
          <strong class="text-[0.92rem] text-ink-heading">板块 / 行业资金流</strong>
          <div class="mt-2 grid gap-2">
            <div
              v-for="sector in snapshot.sectorFlows"
              :key="`${snapshot.market}-${sector.code}`"
              class="flex items-center justify-between rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-2"
            >
              <div>
                <div class="text-[0.92rem] font-semibold text-[#3b3b3b]">{{ sector.label }}</div>
                <div class="text-[0.8rem] text-ink-secondary">
                  龙头 {{ sector.leadingStockName ?? "--" }} {{ sector.leadingStockCode ? `(${sector.leadingStockCode})` : "" }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-[0.84rem]" :class="numberToneClass(sector.netInflowBillion)">
                  {{ formatSignedAmount(sector.netInflowBillion, "CNY") }}
                </div>
                <div class="text-[0.8rem]" :class="numberToneClass(sector.changePercent)">
                  {{ formatSignedPercent(sector.changePercent) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="snapshot.topMovers?.length" class="mt-3 rounded-2xl border border-slate-400/15 bg-white/80 px-3.5 py-3">
          <strong class="text-[0.92rem] text-ink-heading">异动个股</strong>
          <div class="mt-2 grid gap-2 lg:grid-cols-2">
            <div class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-2.5">
              <div class="mb-2 text-[0.82rem] font-semibold text-emerald-700">涨幅居前</div>
              <div class="grid gap-2">
                <div
                  v-for="mover in snapshot.topMovers"
                  :key="`${snapshot.market}-up-${mover.code}`"
                  class="rounded-lg border border-slate-400/10 bg-white/50 px-2.5 py-2"
                >
                  <div class="flex items-start justify-between gap-3 text-[0.86rem]">
                    <div>
                      <div class="font-semibold text-[#3b3b3b]">{{ mover.label }}</div>
                      <div class="text-[0.78rem] text-ink-secondary">{{ mover.code }}</div>
                    </div>
                    <div class="text-right">
                      <div :class="numberToneClass(mover.changePercent)">{{ formatSignedPercent(mover.changePercent) }}</div>
                      <div class="text-[0.78rem] text-ink-secondary">{{ formatAmount(mover.turnoverBillion, moverCurrency(snapshot.market)) }}</div>
                    </div>
                  </div>
                  <div v-if="mover.reasons?.length" class="mt-2 grid gap-1">
                    <div
                      v-for="reason in mover.reasons"
                      :key="`${mover.code}-${reason}`"
                      class="text-[0.78rem] leading-5 text-ink-secondary"
                    >
                      {{ reason }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="snapshot.topDecliners?.length" class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-2.5">
              <div class="mb-2 text-[0.82rem] font-semibold text-rose-700">跌幅居前</div>
              <div class="grid gap-2">
                <div
                  v-for="mover in snapshot.topDecliners"
                  :key="`${snapshot.market}-down-${mover.code}`"
                  class="rounded-lg border border-slate-400/10 bg-white/50 px-2.5 py-2"
                >
                  <div class="flex items-start justify-between gap-3 text-[0.86rem]">
                    <div>
                      <div class="font-semibold text-[#3b3b3b]">{{ mover.label }}</div>
                      <div class="text-[0.78rem] text-ink-secondary">{{ mover.code }}</div>
                    </div>
                    <div class="text-right">
                      <div :class="numberToneClass(mover.changePercent)">{{ formatSignedPercent(mover.changePercent) }}</div>
                      <div class="text-[0.78rem] text-ink-secondary">{{ formatAmount(mover.turnoverBillion, moverCurrency(snapshot.market)) }}</div>
                    </div>
                  </div>
                  <div v-if="mover.reasons?.length" class="mt-2 grid gap-1">
                    <div
                      v-for="reason in mover.reasons"
                      :key="`${mover.code}-${reason}`"
                      class="text-[0.78rem] leading-5 text-ink-secondary"
                    >
                      {{ reason }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="snapshot.highlights.length" class="mt-3 rounded-2xl border border-slate-400/15 bg-white/80 px-3.5 py-3">
          <strong class="text-[0.92rem] text-ink-heading">重点提示</strong>
          <div class="mt-2 grid gap-2">
            <div
              v-for="item in snapshot.highlights"
              :key="`${snapshot.market}-${item}`"
              class="rounded-xl border border-slate-400/15 bg-slate-50/70 px-3 py-2 text-[0.88rem] leading-6 text-[#4b5563]"
            >
              {{ item }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeMarketOverview } from "../../../../lib/api";

defineProps<{
  marketOverview: ThemeMarketOverview;
}>();

function toneClass(tone: string): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.8rem] font-semibold";

  switch (tone) {
    case "positive": return `${base} bg-emerald-100 text-emerald-800`;
    case "negative": return `${base} bg-rose-100 text-rose-800`;
    default: return `${base} bg-amber-100 text-amber-800`;
  }
}

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

function formatSignedAmount(value: number | null, currency: string | null): string {
  if (value == null) {
    return "--";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} 亿${currency ?? ""}`.trim();
}

function formatAmount(value: number | null, currency: string | null): string {
  if (value == null) {
    return "--";
  }

  return `${value.toFixed(2)} 亿${currency ?? ""}`.trim();
}

function formatLatest(value: number | null): string {
  if (value == null) {
    return "--";
  }

  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function moverCurrency(market: string): string {
  return market === "hk" ? "HKD" : "CNY";
}

function flowDirectionLabel(direction: string): string {
  switch (direction) {
    case "inflow": return "净流入";
    case "outflow": return "净流出";
    default: return "持平";
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(/\//g, "-");
}
</script>
