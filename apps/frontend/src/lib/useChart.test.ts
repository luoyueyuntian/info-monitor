// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => {
  let resolve!: (value: Record<string, unknown>) => void;
  const ready = new Promise<Record<string, unknown>>((finish) => { resolve = finish; });
  return { init: vi.fn(), chart: { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() }, resolve, ready };
});
vi.mock("echarts", () => ({ init: mocked.init }));
vi.mock("./chart-loader", () => ({ loadChartRuntime: () => mocked.ready }));
import { useChart } from "./useChart";

describe("lazy chart lifecycle", () => {
  it("does not initialize disposed views and disconnects observers", async () => {
    mocked.init.mockReturnValue(mocked.chart);
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect = disconnect; });
    const Host = defineComponent({ setup() { const node = ref<HTMLElement | null>(null); useChart(node, () => ({ series: [] })); return () => h("div", { ref: node }); } });
    const first = mount(Host);
    await flushPromises();
    expect(mocked.init).not.toHaveBeenCalled();
    first.unmount();
    const second = mount(Host);
    await flushPromises();
    mocked.resolve!({ init: mocked.init });
    await flushPromises();
    await vi.waitFor(() => expect(mocked.init).toHaveBeenCalledTimes(1));
    second.unmount();
    expect(mocked.chart.dispose).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
