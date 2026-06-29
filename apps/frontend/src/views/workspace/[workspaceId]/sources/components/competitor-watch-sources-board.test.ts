// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";

import CompetitorWatchSourcesBoard from "./CompetitorWatchSourcesBoard.vue";
import { fallbackEvents, fallbackSources, fallbackThemes } from "../../../../../test-fixtures/demo-fixtures";
import { buildWorkspaceDataset, workspaceReferenceNow } from "../../../../../lib/workspaces";

const dataset = buildWorkspaceDataset("competitor-watch", fallbackThemes, fallbackEvents, fallbackSources);

vi.mock("../../../../../lib/api", () => ({
  fetchSourcePresets: vi.fn().mockResolvedValue([
    {
      id: "figma-release-notes",
      label: "Figma Release Notes",
      description: "Track Figma product release notes and change logs.",
      sourceType: "page_list",
      adapterKey: "figma_release_notes",
      infoType: "content_update",
      fields: [],
      defaultConfig: {},
    },
  ]),
  createTheme: vi.fn(),
  createSource: vi.fn(),
  updateSourcePaused: vi.fn(),
}));

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
    allSources: computed(() => fallbackSources),
    allThemes: computed(() => fallbackThemes),
    referenceNow: computed(() => workspaceReferenceNow(dataset)),
    load: vi.fn(),
  }),
}));

describe("CompetitorWatchSourcesBoard", () => {
  it("renders competitor source groupings and the shared source catalog", async () => {
    const wrapper = mount(CompetitorWatchSourcesBoard, {
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("竞品来源台");
    expect(wrapper.text()).toContain("待验证来源");
    expect(wrapper.text()).toContain("数据源目录");
    expect(wrapper.text()).toContain("Figma");
  });
});
