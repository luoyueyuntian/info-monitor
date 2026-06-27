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
  horizontal?: boolean;
}>(), {
  height: 200,
  color: "#3b82f6",
});

const chartOptions = computed<EChartsOption>(() => ({
  grid: { top: 8, right: 12, bottom: 28, left: 40 },
  tooltip: { trigger: "axis" },
  xAxis: props.horizontal
    ? { type: "value", axisLabel: { fontSize: 10, color: "#766f63" }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.1)" } } }
    : { type: "category", data: props.labels, axisLabel: { fontSize: 10, color: "#766f63" }, axisLine: { lineStyle: { color: "rgba(148,163,184,0.15)" } } },
  yAxis: props.horizontal
    ? { type: "category", data: props.labels, axisLabel: { fontSize: 10, color: "#766f63" }, axisLine: { lineStyle: { color: "rgba(148,163,184,0.15)" } } }
    : { type: "value", axisLabel: { fontSize: 10, color: "#766f63" }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.1)" } } },
  series: [{
    type: "bar",
    data: props.values,
    barMaxWidth: 32,
    itemStyle: {
      color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [
        { offset: 0, color: props.color },
        { offset: 1, color: `${props.color}88` },
      ] },
      borderRadius: props.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
    },
  }],
}));
</script>
