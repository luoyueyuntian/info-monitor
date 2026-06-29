// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import SearchView from "./index.vue";

const apiMocks = vi.hoisted(() => ({
  searchQuery: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  searchQuery: apiMocks.searchQuery,
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
}));

describe("search page", () => {
  it("shows an error message when search fails", async () => {
    apiMocks.searchQuery.mockRejectedValue(new Error("Search backend is unavailable."));

    const wrapper = mount(SearchView, {
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template: "<a><slot /></a>",
          },
        },
      },
    });

    await wrapper.find("input").setValue("figma");
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Search backend is unavailable.");
  });
});
