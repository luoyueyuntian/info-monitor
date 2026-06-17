// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";

import CompetitorWatchReportsBoard from "./CompetitorWatchReportsBoard.vue";
import { fallbackEvents, fallbackSources, fallbackThemes } from "../../../../../lib/demo-fixtures";
import { buildWorkspaceDataset, workspaceReferenceNow } from "../../../../../lib/workspaces";

const dataset = buildWorkspaceDataset("competitor-watch", fallbackThemes, fallbackEvents, fallbackSources);

vi.mock("vue-router", () => ({
  useRoute: () => ({
    params: {
      workspaceId: "competitor-watch",
    },
  }),
  useRouter: () => ({
    replace: vi.fn(),
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

describe("CompetitorWatchReportsBoard", () => {
  it("renders competitor report summaries", () => {
    const wrapper = mount(CompetitorWatchReportsBoard, {
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("竞品情报摘要");
    expect(wrapper.text()).toContain("今日脉冲");
    expect(wrapper.text()).toContain("下一步建议");
  });
});
