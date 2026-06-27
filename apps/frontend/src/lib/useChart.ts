import { type Ref, markRaw, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

export function useChart(
  containerRef: Ref<HTMLElement | null>,
  options: () => EChartsOption,
) {
  const chart = shallowRef<echarts.ECharts | null>(null);

  function init() {
    if (!containerRef.value) return;
    chart.value = markRaw(echarts.init(containerRef.value));
    chart.value.setOption(options());
  }

  function update() {
    if (chart.value) {
      chart.value.setOption(options(), { notMerge: true });
    }
  }

  function resize() {
    chart.value?.resize();
  }

  onMounted(() => {
    nextTick(init);
    window.addEventListener("resize", resize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", resize);
    chart.value?.dispose();
  });

  watch(options, update, { deep: true });

  return { chart, resize };
}
