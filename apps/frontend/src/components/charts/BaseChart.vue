<template>
  <div ref="container" :style="{ width: '100%', height: `${height}px` }" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { EChartsOption } from "echarts";

import { useChart } from "../../lib/useChart";

const props = withDefaults(defineProps<{
  options: EChartsOption;
  height?: number;
}>(), {
  height: 320,
});

const container = ref<HTMLElement | null>(null);

useChart(container, () => props.options);
</script>
