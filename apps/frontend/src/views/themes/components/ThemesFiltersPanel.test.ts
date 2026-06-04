// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import ThemesFiltersPanel from "./ThemesFiltersPanel.vue";

describe("ThemesFiltersPanel", () => {
  it("delegates user interactions through callback props", async () => {
    const applyThemePreset = vi.fn();
    const resetFilters = vi.fn();
    const setQuery = vi.fn();
    const setTypeFilter = vi.fn();
    const setEventQueueFilter = vi.fn();
    const setHealthFilter = vi.fn();
    const setRecentOnly24h = vi.fn();
    const setSortBy = vi.fn();
    const clearQuery = vi.fn();

    const wrapper = mount(ThemesFiltersPanel, {
      props: {
        presets: [{ id: "open-events", label: "待处理主题" }],
        activePresetId: "",
        filterSummary: "全部主题",
        query: "pbc",
        typeFilter: "all",
        eventQueueFilter: "all",
        healthFilter: "all",
        recentOnly24h: false,
        sortBy: "priority",
        applyThemePreset,
        resetFilters,
        setQuery,
        setTypeFilter,
        setEventQueueFilter,
        setHealthFilter,
        setRecentOnly24h,
        setSortBy,
        clearQuery,
      },
    });

    await wrapper.find("button.quick-preset-button").trigger("click");
    await wrapper.find("input").setValue("macro");
    await wrapper.findAll("select")[0].setValue("price");
    await wrapper.findAll("select")[1].setValue("open");
    await wrapper.findAll("select")[2].setValue("warning");
    await wrapper.find("input[type='checkbox']").setValue(true);
    await wrapper.findAll("select")[3].setValue("latestEvent");
    const buttons = wrapper.findAll("button");
    await buttons.find((item) => item.text() === "重置筛选")!.trigger("click");
    await buttons.find((item) => item.text() === "清空搜索")!.trigger("click");

    expect(applyThemePreset).toHaveBeenCalledWith("open-events");
    expect(setQuery).toHaveBeenCalledWith("macro");
    expect(setTypeFilter).toHaveBeenCalledWith("price");
    expect(setEventQueueFilter).toHaveBeenCalledWith("open");
    expect(setHealthFilter).toHaveBeenCalledWith("warning");
    expect(setRecentOnly24h).toHaveBeenCalledWith(true);
    expect(setSortBy).toHaveBeenCalledWith("latestEvent");
    expect(resetFilters).toHaveBeenCalledTimes(1);
    expect(clearQuery).toHaveBeenCalledTimes(1);
  });
});
