// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";

import CompetitorWatchActionsBoard from "./CompetitorWatchActionsBoard.vue";
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

vi.mock("../../../../../lib/api", () => ({
  updateEventStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../shared/useWorkspaceData", () => ({
  useWorkspaceData: () => ({
    workspace: computed(() => dataset.workspace),
    dataset: computed(() => dataset),
    referenceNow: computed(() => workspaceReferenceNow(dataset)),
    load: vi.fn(),
  }),
}));

describe("CompetitorWatchActionsBoard", () => {
  it("renders competitor action groupings and object labels", () => {
    const wrapper = mount(CompetitorWatchActionsBoard, {
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("竞品分诊台");
    expect(wrapper.text()).toContain("功能与版本");
    expect(wrapper.text()).toContain("Figma");
  });
});
