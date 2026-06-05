import { describe, expect, it } from "vitest";

import {
  buildSourceStatusManagedQuery,
  matchesSourceStatusPresetFilters,
  readSourceStatusRouteFilters,
} from "./source-status-query";

describe("source-status-query", () => {
  const themeOptions = [{ id: "theme_1" }, { id: "theme_2" }];

  it("builds canonical source status query", () => {
    expect(
      buildSourceStatusManagedQuery({
        focusFilter: "warning",
        impactFilter: "negative",
        themeFilter: "theme_1",
        recentOnly24h: true,
        sinceFilter: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      focus: "warning",
      impact: "negative",
      themeId: "theme_1",
      recent: "24h",
      since: "2026-01-01T00:00:00.000Z",
    });
  });

  it("reads route filters with safe fallbacks", () => {
    expect(
      readSourceStatusRouteFilters(
        {
          focus: "pending",
          impact: "positive",
          themeId: "theme_2",
          recent: "24h",
          since: "2026-01-01T00:00:00.000Z",
        },
        themeOptions,
        () => true,
      ),
      ).toEqual({
        focusFilter: "pending",
        impactFilter: "positive",
        themeFilter: "theme_2",
        recentOnly24h: true,
        sinceFilter: "2026-01-01T00:00:00.000Z",
    });

    expect(
      readSourceStatusRouteFilters(
        {
          focus: "invalid",
          impact: "invalid",
          themeId: "invalid",
          recent: "nope",
          since: "bad",
        },
        themeOptions,
        () => false,
      ),
      ).toEqual({
        focusFilter: "all",
        impactFilter: "all",
        themeFilter: "all",
        recentOnly24h: false,
        sinceFilter: "",
    });
  });

  it("keeps valid multi-theme context from the route", () => {
    expect(
      readSourceStatusRouteFilters(
        {
          themeId: "theme_1,theme_2",
        },
        themeOptions,
        () => true,
      ),
    ).toEqual({
      focusFilter: "all",
      impactFilter: "all",
      themeFilter: "theme_1,theme_2",
      recentOnly24h: false,
      sinceFilter: "",
    });
  });

  it("matches source presets on focus and recent filters", () => {
    const presets = [
      {
        id: "recent-warning",
        filters: {
          focus: "warning",
          impact: "negative",
          recent: true,
        },
      },
    ] as const;

    expect(
      matchesSourceStatusPresetFilters("recent-warning", presets, {
        focusFilter: "warning",
        impactFilter: "negative",
        themeFilter: "all",
        recentOnly24h: true,
        sinceFilter: "",
      }),
    ).toBe(true);
  });
});
