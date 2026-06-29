// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import StockMarketReportsBoard from "./StockMarketReportsBoard.vue";
import { fallbackEvents, fallbackSources, fallbackThemes } from "../../../../../test-fixtures/demo-fixtures";
import { buildWorkspaceDataset, workspaceReferenceNow } from "../../../../../lib/workspaces";
import { buildStockMarketAuthorityBrief } from "../../../../../workspaces/stock-market/authority-brief";

const dataset = buildWorkspaceDataset("stock-market", fallbackThemes, fallbackEvents, fallbackSources);

vi.mock("vue-router", () => ({
  useRoute: () => ({
    params: {
      workspaceId: "stock-market",
    },
    query: {},
  }),
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("../../../../../lib/api", () => ({
  fetchThemeDetail: vi.fn(async () => null),
  fetchStockMarketAuthorityBrief: vi.fn(async () =>
    buildStockMarketAuthorityBrief({
      themes: fallbackThemes,
      events: fallbackEvents,
      sources: fallbackSources,
    }),
  ),
}));

vi.mock("../../../../../lib/stock-market-report-state", () => ({
  refreshStockMarketReportState: vi.fn(async () => undefined),
  selectStockMarketReportDate: vi.fn(async () => undefined),
  useStockMarketReportState: () => ({
    report: ref(null),
    history: ref([]),
    selectedSnapshot: ref(null),
  }),
}));

vi.mock("../../../shared/useWorkspaceData", () => ({
  useWorkspaceData: () => ({
    workspace: computed(() => dataset.workspace),
    dataset: computed(() => dataset),
    referenceNow: computed(() => workspaceReferenceNow(dataset)),
    load: vi.fn(),
  }),
}));

describe("StockMarketReportsBoard", () => {
  it("renders authority brief sections from official sources", async () => {
    const wrapper = mount(StockMarketReportsBoard, {
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
          TechnicalIndicatorsPanel: {
            template: "<div />",
          },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("权威站点归并");
    expect(wrapper.text()).toContain("政策与流动性");
    expect(wrapper.text()).toContain("监管口径");
    expect(wrapper.text()).toContain("交易所公告");
    expect(wrapper.text()).toContain("国家统计局发布5月份国民经济运行情况");
  });
});
