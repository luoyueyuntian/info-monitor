// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import FilterBar from "./FilterBar.vue";

const apiMocks = vi.hoisted(() => ({
  fetchSavedFilterViews: vi.fn(),
  saveFilterView: vi.fn(),
  deleteFilterView: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  fetchSavedFilterViews: apiMocks.fetchSavedFilterViews,
  saveFilterView: apiMocks.saveFilterView,
  deleteFilterView: apiMocks.deleteFilterView,
}));

describe("filter bar saved views", () => {
  it("shows an error message when saving a view fails", async () => {
    apiMocks.fetchSavedFilterViews.mockResolvedValue([]);
    apiMocks.saveFilterView.mockRejectedValue(new Error("保存失败"));

    const wrapper = mount(FilterBar, {
      props: {
        presets: [],
        activePresetId: "",
        filterSummary: "无",
        viewType: "themes",
        currentFilters: { status: "active" },
      },
    });

    await flushPromises();

    const toggleButton = wrapper.findAll("button").find((button) => button.text().includes("已保存视角"));
    expect(toggleButton).toBeDefined();
    await toggleButton!.trigger("click");
    await flushPromises();

    const input = wrapper.find("input");
    await input.setValue("我的视角");

    const saveButton = wrapper.findAll("button").find((button) => button.text().trim() === "保存");
    expect(saveButton).toBeDefined();
    await saveButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("保存失败");
  });

  it("shows an error message when deleting a view fails", async () => {
    apiMocks.fetchSavedFilterViews.mockResolvedValue([
      {
        id: "view-1",
        name: "已保存视角",
        viewType: "themes",
        filters: { status: "active" },
        createdAt: "2026-06-01T00:00:00Z",
      },
    ]);
    apiMocks.deleteFilterView.mockRejectedValue(new Error("删除失败"));

    const wrapper = mount(FilterBar, {
      props: {
        presets: [],
        activePresetId: "",
        filterSummary: "无",
        viewType: "themes",
        currentFilters: { status: "active" },
      },
    });

    await flushPromises();

    const toggleButton = wrapper.findAll("button").find((button) => button.text().includes("已保存视角"));
    expect(toggleButton).toBeDefined();
    await toggleButton!.trigger("click");
    await flushPromises();

    const deleteButton = wrapper.findAll("button").find((button) => button.text().trim() === "✕");
    expect(deleteButton).toBeDefined();
    await deleteButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("删除失败");
  });
});
