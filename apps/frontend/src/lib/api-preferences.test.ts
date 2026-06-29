// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchSavedFilterViews, fetchThemeFavorites, isThemeFavorited, saveFilterView, setThemeFavorite } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("preferences API strict runtime behavior", () => {
  it("does not fall back to localStorage for theme favorites when the API fails", async () => {
    localStorage.setItem("themeFavorites", JSON.stringify(["theme-local-only"]));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(fetchThemeFavorites()).rejects.toThrow(/请求失败 \(500\)/);
  });

  it("does not fall back to localStorage for saved filter views when the API fails", async () => {
    localStorage.setItem("savedFilterViews", JSON.stringify([
      {
        id: "view_local",
        name: "Local View",
        viewType: "themes",
        filters: { status: "active" },
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(fetchSavedFilterViews("themes")).rejects.toThrow(/请求失败 \(500\)/);
  });

  it("does not create a local saved view when the API write fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(saveFilterView({
      name: "Broken Save",
      viewType: "themes",
      filters: { status: "active" },
    })).rejects.toThrow(/请求失败 \(500\)/);

    expect(localStorage.getItem("savedFilterViews")).toBeNull();
  });

  it("does not persist a theme favorite locally when the API write fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(setThemeFavorite("theme-local-only", true)).rejects.toThrow(/请求失败 \(500\)/);

    expect(localStorage.getItem("themeFavorites")).toBeNull();
    expect(isThemeFavorited("theme-local-only")).toBe(false);
  });
});
