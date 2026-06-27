<template>
  <div class="grid gap-3 md:grid-cols-2">
    <div v-for="chart in indicatorCharts" :key="chart.title" class="rounded-2xl border border-slate-400/15 bg-white/70 p-3">
      <div class="mb-2 flex items-center gap-2">
        <strong class="text-[0.88rem] text-ink-heading">{{ chart.title }}</strong>
        <span
          class="rounded-full px-2 py-0.5 text-[0.78rem] font-semibold"
          :class="chart.signalClass"
        >
          {{ chart.signalLabel }}
        </span>
      </div>
      <BaseChart :options="chart.options" :height="160" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";

import BaseChart from "./BaseChart.vue";

export type IndicatorData = {
  labels: string[];
  rsi?: number[];
  macd?: { dif: number[]; dea: number[]; histogram: number[] };
  kdj?: { k: number[]; d: number[]; j: number[] };
  boll?: { upper: number[]; middle: number[]; lower: number[] };
};

const props = defineProps<{
  data: IndicatorData;
  currentSignals?: {
    rsi?: string;
    macd?: string;
    kdj?: string;
    boll?: string;
  };
}>();

function signalClass(signal?: string): string {
  if (!signal) return "bg-slate-100 text-slate-600";
  if (signal.includes("超买") || signal.includes("死叉") || signal.includes("上轨"))
    return "bg-red-50 text-red-700";
  if (signal.includes("超卖") || signal.includes("金叉") || signal.includes("下轨"))
    return "bg-green-50 text-green-700";
  return "bg-slate-100 text-slate-600";
}

const indicatorCharts = computed(() => {
  const charts: Array<{ title: string; signalLabel: string; signalClass: string; options: EChartsOption }> = [];
  const labels = props.data.labels;
  const axisBase = {
    axisLabel: { fontSize: 10, color: "#766f63" },
    axisLine: { lineStyle: { color: "rgba(148,163,184,0.15)" } },
  };

  if (props.data.rsi) {
    charts.push({
      title: "RSI",
      signalLabel: props.currentSignals?.rsi ?? "--",
      signalClass: signalClass(props.currentSignals?.rsi),
      options: {
        grid: { top: 10, right: 8, bottom: 20, left: 36 },
        xAxis: { type: "category", data: labels, ...axisBase, show: false },
        yAxis: { type: "value", min: 0, max: 100, ...axisBase, splitLine: { lineStyle: { color: "rgba(148,163,184,0.1)" } } },
        series: [{
          type: "line", data: props.data.rsi, smooth: true, symbol: "none",
          lineStyle: { width: 2, color: "#8b5cf6" },
          markLine: {
            silent: true,
            lineStyle: { type: "dashed", color: "#94a3b8" },
            data: [
              { yAxis: 70, label: { formatter: "70", fontSize: 9 } },
              { yAxis: 30, label: { formatter: "30", fontSize: 9 } },
            ],
          },
        }],
      },
    });
  }

  if (props.data.macd) {
    charts.push({
      title: "MACD",
      signalLabel: props.currentSignals?.macd ?? "--",
      signalClass: signalClass(props.currentSignals?.macd),
      options: {
        grid: { top: 10, right: 8, bottom: 20, left: 36 },
        xAxis: { type: "category", data: labels, ...axisBase, show: false },
        yAxis: { type: "value", ...axisBase, splitLine: { lineStyle: { color: "rgba(148,163,184,0.1)" } } },
        series: [
          { type: "line", data: props.data.macd.dif, smooth: true, symbol: "none", lineStyle: { width: 1.5, color: "#3b82f6" } },
          { type: "line", data: props.data.macd.dea, smooth: true, symbol: "none", lineStyle: { width: 1.5, color: "#f59e0b" } },
          {
            type: "bar", data: props.data.macd.histogram.map((v) => ({
              value: v, itemStyle: { color: v >= 0 ? "#22c55e88" : "#ef444488" },
            })),
          },
        ],
      },
    });
  }

  if (props.data.kdj) {
    charts.push({
      title: "KDJ",
      signalLabel: props.currentSignals?.kdj ?? "--",
      signalClass: signalClass(props.currentSignals?.kdj),
      options: {
        grid: { top: 10, right: 8, bottom: 20, left: 36 },
        xAxis: { type: "category", data: labels, ...axisBase, show: false },
        yAxis: { type: "value", ...axisBase, splitLine: { lineStyle: { color: "rgba(148,163,184,0.1)" } } },
        series: [
          { type: "line", data: props.data.kdj.k, smooth: true, symbol: "none", lineStyle: { width: 1.5, color: "#3b82f6" }, name: "K" },
          { type: "line", data: props.data.kdj.d, smooth: true, symbol: "none", lineStyle: { width: 1.5, color: "#f59e0b" }, name: "D" },
          { type: "line", data: props.data.kdj.j, smooth: true, symbol: "none", lineStyle: { width: 1.5, color: "#8b5cf6" }, name: "J" },
        ],
      },
    });
  }

  if (props.data.boll) {
    charts.push({
      title: "BOLL",
      signalLabel: props.currentSignals?.boll ?? "--",
      signalClass: signalClass(props.currentSignals?.boll),
      options: {
        grid: { top: 10, right: 8, bottom: 20, left: 36 },
        xAxis: { type: "category", data: labels, ...axisBase, show: false },
        yAxis: { type: "value", ...axisBase, splitLine: { lineStyle: { color: "rgba(148,163,184,0.1)" } } },
        series: [
          { type: "line", data: props.data.boll.upper, smooth: true, symbol: "none", lineStyle: { width: 1.5, color: "#ef4444" } },
          { type: "line", data: props.data.boll.middle, smooth: true, symbol: "none", lineStyle: { width: 2, color: "#3b82f6" } },
          { type: "line", data: props.data.boll.lower, smooth: true, symbol: "none", lineStyle: { width: 1.5, color: "#22c55e" } },
        ],
      },
    });
  }

  return charts;
});
</script>
