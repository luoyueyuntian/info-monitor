// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";

import CompetitorWatchSourcesBoard from "./CompetitorWatchSourcesBoard.vue";
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

describe("CompetitorWatchSourcesBoard", () => {
  it("renders competitor source groupings", () => {
    const wrapper = mount(CompetitorWatchSourcesBoard, {
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("竞品来源台");
    expect(wrapper.text()).toContain("待验证来源");
    expect(wrapper.text()).toContain("Figma");
  });
});
