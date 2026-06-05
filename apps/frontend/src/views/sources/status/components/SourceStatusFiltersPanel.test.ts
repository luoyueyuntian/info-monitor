// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import SourceStatusFiltersPanel from "./SourceStatusFiltersPanel.vue";

describe("SourceStatusFiltersPanel", () => {
  it("delegates focus, preset, recent toggle and clear-since actions", async () => {
    const applySourcePreset = vi.fn();
    const resetFilters = vi.fn();
    const setFocusFilter = vi.fn();
    const setThemeFilter = vi.fn();
    const setImpactFilter = vi.fn();
    const setRecentOnly24h = vi.fn();
    const clearSinceFilter = vi.fn();

    const wrapper = mount(SourceStatusFiltersPanel, {
      props: {
        presets: [{ id: "warning", label: "异常来源" }],
        activePresetId: "",
        filterSummary: "全部来源",
        focusFilter: "all",
        themeFilter: "all",
        themeOptions: [{ id: "theme_1", name: "Theme One" }],
        impactFilter: "all",
        recentOnly24h: false,
        sinceFilter: "2026-01-01T00:00:00.000Z",
        incrementalSourceCount: 3,
        applySourcePreset,
        resetFilters,
        setFocusFilter,
        setThemeFilter,
        setImpactFilter,
        setRecentOnly24h,
        clearSinceFilter,
      },
    });

    await wrapper.find("button.quick-preset-button").trigger("click");
    await wrapper.findAll("select")[0].setValue("pending");
    await wrapper.findAll("select")[1].setValue("theme_1");
    await wrapper.findAll("select")[2].setValue("negative");
    await wrapper.find("input[type='checkbox']").setValue(true);
    const buttons = wrapper.findAll("button");
    await buttons.find((item) => item.text() === "重置筛选")!.trigger("click");
    await buttons.find((item) => item.text() === "退出增量视图")!.trigger("click");

    expect(applySourcePreset).toHaveBeenCalledWith("warning");
    expect(setFocusFilter).toHaveBeenCalledWith("pending");
    expect(setThemeFilter).toHaveBeenCalledWith("theme_1");
    expect(setImpactFilter).toHaveBeenCalledWith("negative");
    expect(setRecentOnly24h).toHaveBeenCalledWith(true);
    expect(resetFilters).toHaveBeenCalledTimes(1);
    expect(clearSinceFilter).toHaveBeenCalledTimes(1);
  });
});
