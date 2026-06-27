<template>
  <BaseChart :options="chartOptions" :height="height" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";

import BaseChart from "./BaseChart.vue";

export type SignalPoint = {
  date: string;
  signal: string;
  label: string;
  value?: number;
};

const props = withDefaults(defineProps<{
  labels: string[];
  values: number[];
  signals: SignalPoint[];
  height?: number;
}>(), {
  height: 300,
});

const signalColorMap: Record<string, string> = {
  bullish: "#22c55e",
  bearish: "#ef4444",
  "30d_low": "#f59e0b",
  golden_cross: "#22c55e",
  death_cross: "#ef4444",
  overbought: "#ef4444",
  oversold: "#22c55e",
};

const chartOptions = computed<EChartsOption>(() => {
  const signalMarkPoints = props.signals.map((s) => ({
    name: s.label,
    coord: [s.date, s.value ?? 0],
    symbol: "pin",
    symbolSize: 36,
    itemStyle: { color: signalColorMap[s.signal] ?? "#6b4f1f" },
    label: { fontSize: 9, color: "#fff" },
  }));

  return {
    grid: { top: 30, right: 16, bottom: 32, left: 52 },
    tooltip: {
      trigger: "axis",
      formatter(params: unknown) {
        const item = Array.isArray(params) ? params[0] : null;
        if (!item || typeof item !== "object") return "";
        const d = item as { name: string; value: number; marker: string };
        const signal = props.signals.find((s) => s.date === d.name);
        const signalText = signal ? `<br/>${signal.label}` : "";
        return `${d.name}<br/>${d.marker} ${d.value}${signalText}`;
      },
    },
    xAxis: {
      type: "category",
      data: props.labels,
      axisLabel: { fontSize: 11, color: "#766f63" },
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.15)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 11, color: "#766f63" },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.1)" } },
    },
    series: [
      {
        type: "line",
        data: props.values,
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: 2, color: "#475569" },
        itemStyle: { color: "#475569" },
        markPoint: signalMarkPoints.length
          ? { data: signalMarkPoints }
          : undefined,
      },
    ],
  };
});
</script>
