<template>
  <BaseChart :options="chartOptions" :height="height" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";

import BaseChart from "./BaseChart.vue";

export type CandlestickDataPoint = {
  date: string;
  open: number;
  close: number;
  low: number;
  high: number;
};

const props = withDefaults(defineProps<{
  data: CandlestickDataPoint[];
  height?: number;
  volumes?: { date: string; value: number; isUp: boolean }[];
}>(), {
  height: 400,
});

const chartOptions = computed<EChartsOption>(() => {
  const dates = props.data.map((d) => d.date);
  const ohlc = props.data.map((d) => [d.open, d.close, d.low, d.high]);

  const series: EChartsOption["series"] = [
    {
      type: "candlestick",
      data: ohlc,
      itemStyle: {
        color: "#ef4444",
        color0: "#22c55e",
        borderColor: "#ef4444",
        borderColor0: "#22c55e",
      },
    },
  ];

  if (props.volumes?.length) {
    series.push({
      type: "bar",
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: props.volumes.map((v) => ({
        value: v.value,
        itemStyle: { color: v.isUp ? "#ef444466" : "#22c55e66" },
      })),
    });
  }

  return {
    grid: props.volumes?.length
      ? [
          { top: 20, right: 16, bottom: "35%", left: 52 },
          { top: "72%", right: 16, bottom: 28, left: 52 },
        ]
      : { top: 20, right: 16, bottom: 32, left: 52 },
    tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
    xAxis: [
      {
        type: "category",
        data: dates,
        axisLabel: { fontSize: 11, color: "#766f63" },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.15)" } },
      },
      ...(props.volumes?.length
        ? [{ type: "category" as const, gridIndex: 1, data: dates, axisLabel: { show: false } }]
        : []),
    ],
    yAxis: [
      {
        type: "value",
        axisLabel: { fontSize: 11, color: "#766f63" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.1)" } },
      },
      ...(props.volumes?.length
        ? [{
            type: "value" as const,
            gridIndex: 1,
            axisLabel: { show: false },
            splitLine: { show: false },
          }]
        : []),
    ],
    series,
  };
});
</script>
