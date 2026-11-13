import { loadChartRuntime } from "./chart-loader";
import { type Ref, markRaw, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import type { EChartsType } from "echarts/core";
import type { EChartsOption } from "echarts";

export function useChart(containerRef: Ref<HTMLElement | null>, options: () => EChartsOption) {
  const chart = shallowRef<EChartsType | null>(null);
  let disposed = false;
  let observer: ResizeObserver | undefined;
  let frame: number | undefined;
  const resize = () => {
    if (disposed || frame !== undefined) return;
    frame = requestAnimationFrame(() => { frame = undefined; if (!disposed) chart.value?.resize(); });
  };
  onMounted(async () => {
    await nextTick();
    const runtime = await loadChartRuntime();
    if (disposed || !containerRef.value) return;
    chart.value = markRaw(runtime.init(containerRef.value));
    chart.value.setOption(options());
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(resize); observer.observe(containerRef.value);
    }
    window.addEventListener("resize", resize);
  });
  watch(options, () => chart.value?.setOption(options(), { notMerge: true }), { deep: true });
  onBeforeUnmount(() => {
    disposed = true;
    observer?.disconnect(); window.removeEventListener("resize", resize);
    if (frame !== undefined) cancelAnimationFrame(frame);
    chart.value?.dispose(); chart.value = null;
  });
  return { chart, resize };
}
