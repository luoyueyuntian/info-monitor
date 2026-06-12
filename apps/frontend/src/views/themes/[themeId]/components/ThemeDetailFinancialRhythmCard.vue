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

    <!-- Direction & Amount Summary -->
    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <div class="flex flex-wrap items-center gap-2">
          <strong class="text-[0.92rem] text-ink-heading">方向趋势</strong>
          <span :class="directionToneClass">{{ data.directionTrendLabel }}</span>
        </div>
        <div class="mt-2 text-[0.9rem] text-[#4b5563]">{{ data.directionTrendSummary }}</div>
      </div>
      <div class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <div class="flex flex-wrap items-center gap-2">
          <strong class="text-[0.92rem] text-ink-heading">金额变化</strong>
          <span :class="amountToneClass">{{ amountToneLabel }}</span>
        </div>
        <div class="mt-2 text-[0.9rem] text-[#4b5563]">{{ data.amountTrendLabel }}</div>
      </div>
    </div>

    <!-- Rounds Table -->
    <div v-if="data.rounds.length" class="mt-4 overflow-x-auto">
      <table class="w-full text-[0.9rem]">
        <thead>
          <tr class="border-b border-slate-400/15">
            <th class="pb-2 pr-3 text-left font-semibold text-ink-heading">轮次</th>
            <th class="pb-2 px-2 text-center font-semibold text-ink-heading">方向</th>
            <th class="pb-2 px-2 text-right font-semibold text-ink-heading">金额</th>
            <th class="pb-2 px-2 text-center font-semibold text-ink-heading">期限</th>
            <th class="pb-2 px-2 text-left font-semibold text-ink-heading">操作类型</th>
            <th class="pb-2 pl-2 text-left font-semibold text-ink-heading">公告编号</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="round in data.rounds"
            :key="round.roundIndex"
            class="border-b border-slate-400/10"
          >
            <td class="py-2.5 pr-3 text-ink-secondary whitespace-nowrap">
              {{ formatRoundDate(round.occurredAt) }}
            </td>
            <td class="py-2.5 px-2 text-center">
              <span :class="directionBadgeClass(round.direction)">
                {{ round.directionLabel }}
              </span>
            </td>
            <td class="py-2.5 px-2 text-right font-semibold text-[#1f2937]">
              {{ round.amountLabel }}
            </td>
            <td class="py-2.5 px-2 text-center text-ink-secondary">
              {{ round.termLabel || "--" }}
            </td>
            <td class="py-2.5 px-2 text-ink-secondary">
              {{ round.operationType || "--" }}
            </td>
            <td class="py-2.5 pl-2 text-ink-secondary">
              {{ round.announcementNo || "--" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Direction Flow Visualization -->
    <div v-if="data.rounds.length >= 2" class="mt-4 rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-3.5">
      <strong class="text-[0.92rem] text-ink-heading">方向流向</strong>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <span
          v-for="(round, index) in reversedRounds"
          :key="round.roundIndex"
          class="inline-flex items-center"
        >
          <span :class="directionFlowClass(round.direction)">
            {{ round.directionLabel }}
          </span>
          <span
            v-if="index < reversedRounds.length - 1"
            class="mx-1 text-ink-secondary"
          >
            →
          </span>
        </span>
      </div>
      <div class="mt-2 text-[0.84rem] text-ink-secondary">
        从最早到最新，观察方向是否在强化或切换
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { FinancialRhythmData, FinancialRhythmRound } from "./theme-detail-financial-rhythm";

const props = defineProps<{
  data: FinancialRhythmData;
}>();

const reversedRounds = computed(() => [...props.data.rounds].reverse());

function formatRoundDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(/\//g, "-");
}

const directionToneClass = computed(() => {
  switch (props.data.directionTrend) {
    case "strengthening":
      return "inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[0.8rem] font-semibold text-blue-800";
    case "switching":
      return "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[0.8rem] font-semibold text-amber-800";
    case "neutral":
      return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.8rem] font-semibold text-slate-700";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.8rem] font-semibold text-slate-500";
  }
});

const amountToneClass = computed(() => {
  switch (props.data.amountTrend) {
    case "increasing":
      return "inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-[0.8rem] font-semibold text-green-800";
    case "decreasing":
      return "inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-[0.8rem] font-semibold text-red-800";
    case "stable":
      return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.8rem] font-semibold text-slate-700";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.8rem] font-semibold text-slate-500";
  }
});

const amountToneLabel = computed(() => {
  switch (props.data.amountTrend) {
    case "increasing": return "增加";
    case "decreasing": return "减少";
    case "stable": return "持平";
    default: return "待观察";
  }
});

function directionBadgeClass(direction: string): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.8rem] font-semibold";

  switch (direction) {
    case "liquidity_injection":
      return `${base} bg-green-100 text-green-800`;
    case "liquidity_withdrawal":
      return `${base} bg-red-100 text-red-800`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

function directionFlowClass(direction: string): string {
  const base = "inline-flex items-center rounded-lg px-3 py-1.5 text-[0.84rem] font-semibold";

  switch (direction) {
    case "liquidity_injection":
      return `${base} bg-green-50 text-green-700 border border-green-200`;
    case "liquidity_withdrawal":
      return `${base} bg-red-50 text-red-700 border border-red-200`;
    default:
      return `${base} bg-slate-50 text-slate-600 border border-slate-200`;
  }
}
</script>
