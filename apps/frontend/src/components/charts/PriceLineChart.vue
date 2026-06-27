<template>
  <BaseChart :options="chartOptions" :height="height" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";

import BaseChart from "./BaseChart.vue";

const props = withDefaults(defineProps<{
  labels: string[];
  values: number[];
  height?: number;
  color?: string;
  showArea?: boolean;
}>(), {
  height: 260,
  color: "#475569",
  showArea: true,
});

const chartOptions = computed<EChartsOption>(() => ({
  grid: { top: 20, right: 16, bottom: 32, left: 52 },
  tooltip: { trigger: "axis" },
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
      symbolSize: 5,
      lineStyle: { width: 2.5, color: props.color },
      itemStyle: { color: props.color },
      areaStyle: props.showArea
        ? { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: `${props.color}33` },
            { offset: 1, color: `${props.color}05` },
          ] } }
        : undefined,
    },
  ],
}));
</script>
