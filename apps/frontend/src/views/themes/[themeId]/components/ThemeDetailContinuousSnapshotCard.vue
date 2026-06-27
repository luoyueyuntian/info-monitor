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

    <!-- Spread & Stability Summary -->
    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <div class="flex flex-wrap items-center gap-2">
          <strong class="text-[0.92rem] text-ink-heading">价差趋势</strong>
          <span :class="spreadToneClass">{{ spreadToneLabel }}</span>
        </div>
        <div class="mt-2 text-[0.9rem] text-[#4b5563]">{{ data.spreadTrendLabel }}</div>
      </div>
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <div class="flex flex-wrap items-center gap-2">
          <strong class="text-[0.92rem] text-ink-heading">最低来源</strong>
          <span :class="stabilityToneClass">{{ stabilityToneLabel }}</span>
        </div>
        <div class="mt-2 text-[0.9rem] text-[#4b5563]">{{ data.lowestSourceStabilityLabel }}</div>
      </div>
    </div>

    <!-- Snapshot Rounds Table -->
    <div v-if="data.rounds.length" class="mt-4 overflow-x-auto">
      <table class="w-full text-[0.9rem]">
        <thead>
          <tr class="border-b border-slate-400/15">
            <th class="pb-2 pr-3 text-left font-semibold text-ink-heading">快照轮次</th>
            <th
              v-for="source in sourceColumns"
              :key="source.sourceId"
              class="pb-2 px-2 text-right font-semibold text-ink-heading"
            >
              {{ source.sourceName }}
            </th>
            <th class="pb-2 pl-2 text-right font-semibold text-ink-heading">价差</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="round in data.rounds"
            :key="round.roundIndex"
            class="border-b border-slate-400/10"
          >
            <td class="py-2.5 pr-3 text-ink-secondary whitespace-nowrap">
              {{ formatRoundLabel(round) }}
            </td>
            <td
              v-for="source in sourceColumns"
              :key="`${round.roundIndex}-${source.sourceId}`"
              class="py-2.5 px-2 text-right"
            >
              <span v-if="getSourcePrice(round, source.sourceId) != null">
                <span :class="{ 'font-bold text-[#6a4b14]': isSourceLowest(round, source.sourceId) }">
                  {{ formatPrice(getSourcePrice(round, source.sourceId)) }}
                </span>
                <span
                  v-if="getSourceDelta(round, source.sourceId)"
                  class="ml-1 text-[0.8rem] text-ink-secondary"
                >
                  {{ getSourceDelta(round, source.sourceId) }}
                </span>
                <span
                  v-if="getSourceTrendLabel(round, source.sourceId)"
                  class="ml-1 text-[0.78rem]"
                  :class="getSourceTrendClass(round, source.sourceId)"
                >
                  {{ getSourceTrendLabel(round, source.sourceId) }}
                </span>
              </span>
              <span v-else class="text-ink-secondary">--</span>
            </td>
            <td class="py-2.5 pl-2 text-right text-ink-secondary">
              <span v-if="round.spread != null">
                {{ formatPrice(round.spread) }}
              </span>
              <span v-else>--</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Visual Trend -->
    <div v-if="data.rounds.length >= 2" class="mt-4 rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-3.5">
      <strong class="text-[0.92rem] text-ink-heading">价差变化趋势</strong>
      <div class="mt-3">
        <PriceLineChart
          :labels="spreadTrendData.map((d) => formatShortDate(d.occurredAt))"
          :values="spreadTrendData.map((d) => d.spread)"
          :height="120"
          color="#8a5b1f"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import PriceLineChart from "../../../../components/charts/PriceLineChart.vue";
import type { ContinuousSnapshotCompareData, SnapshotRound } from "./theme-detail-source-compare";

const props = defineProps<{
  data: ContinuousSnapshotCompareData;
}>();

const sourceColumns = computed(() => {
  const firstRound = props.data.rounds[0];
  if (!firstRound) return [];

  return firstRound.sources.map((s) => ({
    sourceId: s.sourceId,
    sourceName: s.sourceName,
  }));
});

function getSourcePrice(round: SnapshotRound, sourceId: string): number | null {
  return round.sources.find((s) => s.sourceId === sourceId)?.price ?? null;
}

function isSourceLowest(round: SnapshotRound, sourceId: string): boolean {
  return round.sources.find((s) => s.sourceId === sourceId)?.isLowest ?? false;
}

function getSourceDelta(round: SnapshotRound, sourceId: string): string | null {
  return round.sources.find((s) => s.sourceId === sourceId)?.deltaFromLowest ?? null;
}

function getSourceTrendLabel(round: SnapshotRound, sourceId: string): string | null {
  return round.sources.find((s) => s.sourceId === sourceId)?.trendLabel ?? null;
}

function getSourceTrendClass(round: SnapshotRound, sourceId: string): string {
  const label = getSourceTrendLabel(round, sourceId);
  if (label === "继续下探") return "text-emerald-600 font-medium";
  if (label === "短线回升") return "text-amber-600 font-medium";
  return "text-ink-secondary";
}

function formatPrice(value: number | null): string {
  if (value == null) return "--";
  return value.toLocaleString("zh-CN");
}

function formatRoundLabel(round: SnapshotRound): string {
  const date = new Date(round.occurredAt);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(/\//g, "-");
}

function formatShortDate(value?: string): string {
  if (!value) return "--";
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replace(/\//g, "-");
}

const spreadToneClass = computed(() => {
  switch (props.data.spreadTrend) {
    case "widening":
      return "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[0.8rem] font-semibold text-amber-800";
    case "narrowing":
      return "inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-[0.8rem] font-semibold text-green-800";
    case "stable":
      return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.8rem] font-semibold text-slate-700";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.8rem] font-semibold text-slate-500";
  }
});

const spreadToneLabel = computed(() => {
  switch (props.data.spreadTrend) {
    case "widening": return "扩大";
    case "narrowing": return "收敛";
    case "stable": return "持平";
    default: return "待观察";
  }
});

const stabilityToneClass = computed(() => {
  switch (props.data.lowestSourceStability) {
    case "stable":
      return "inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-[0.8rem] font-semibold text-green-800";
    case "switching":
      return "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[0.8rem] font-semibold text-amber-800";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.8rem] font-semibold text-slate-500";
  }
});

const stabilityToneLabel = computed(() => {
  switch (props.data.lowestSourceStability) {
    case "stable": return "稳定";
    case "switching": return "切换";
    default: return "待观察";
  }
});

// Spread trend chart
const spreadTrendData = computed(() => {
  const roundsWithSpread = [...props.data.rounds]
    .reverse()
    .filter((r) => r.spread != null);

  if (roundsWithSpread.length < 2) return [];

  const spreads = roundsWithSpread.map((r) => r.spread!);
  const min = Math.min(...spreads);
  const max = Math.max(...spreads);
  const range = max - min || 1;

  return roundsWithSpread.map((round, index) => ({
    x: 20 + (index * (spreadChartWidth.value - 40)) / Math.max(roundsWithSpread.length - 1, 1),
    y: 70 - ((round.spread! - min) / range) * 50,
    occurredAt: round.occurredAt,
    spread: round.spread!,
  }));
});

const spreadTrendPoints = computed(() => {
  return spreadTrendData.value.map((p) => `${p.x},${p.y}`).join(" ");
});

const spreadChartWidth = computed(() => {
  return Math.max(200, props.data.rounds.length * 60);
});
</script>
