// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";

import CompetitorWatchTopicsBoard from "./CompetitorWatchTopicsBoard.vue";
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

describe("CompetitorWatchTopicsBoard", () => {
  it("renders competitor profile groupings and observation recommendations", () => {
    const wrapper = mount(CompetitorWatchTopicsBoard, {
      global: {
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("竞品画像墙");
    expect(wrapper.text()).toContain("高频变化对象");
    expect(wrapper.text()).toContain("待判断");
  });
});
