import { describe, expect, it } from "vitest";

import {
  buildThemeManagedQuery,
  matchesThemePresetFilters,
  readThemeRouteFilters,
} from "./themes-query";

describe("themes-query", () => {
  it("builds canonical managed query from non-default filters", () => {
    expect(
      buildThemeManagedQuery({
        query: "pbc",
        typeFilter: "news_announcement",
        statusFilter: "archived",
        eventQueueFilter: "open",
        healthFilter: "warning",
        impactFilter: "negative",
        sortBy: "latestBookmarked",
        recentOnly24h: true,
        favoritesOnly: false,
      }),
    ).toEqual({
      q: "pbc",
      type: "news_announcement",
      status: "archived",
      queue: "open",
      health: "warning",
      impact: "negative",
      sort: "latestBookmarked",
      recent: "24h",
    });
  });

  it("reads valid route filters and falls back on invalid values", () => {
    expect(
      readThemeRouteFilters({
        q: "macro",
        type: "financial_event",
        status: "paused",
        queue: "bookmarked",
        health: "warning",
        impact: "positive",
        sort: "attention",
        recent: "24h",
      }),
    ).toEqual({
      query: "macro",
      typeFilter: "financial_event",
      statusFilter: "paused",
      eventQueueFilter: "bookmarked",
      healthFilter: "warning",
      impactFilter: "positive",
      sortBy: "attention",
      recentOnly24h: true,
        favoritesOnly: false,
    });

    expect(
      readThemeRouteFilters({
        q: ["ignored"],
        type: "invalid",
        status: "invalid",
        queue: "invalid",
        health: "invalid",
        impact: "invalid",
        sort: "invalid",
      }),
    ).toEqual({
      query: "",
      typeFilter: "all",
      statusFilter: "all",
      eventQueueFilter: "all",
      healthFilter: "all",
      impactFilter: "all",
      sortBy: "priority",
      recentOnly24h: false,
      favoritesOnly: false,
    });
  });

  it("matches presets against current filters", () => {
    const presets = [
      {
        id: "open-events",
        filters: {
          query: "",
          type: "all",
          status: "all",
          queue: "open",
          health: "all",
          impact: "negative",
          sort: "attention",
          recent: false,
        },
      },
    ] as const;

    expect(
      matchesThemePresetFilters("open-events", presets, {
        query: "",
        typeFilter: "all",
        statusFilter: "all",
        eventQueueFilter: "open",
        healthFilter: "all",
        impactFilter: "negative",
        sortBy: "attention",
        recentOnly24h: false,
      favoritesOnly: false,
      }),
    ).toBe(true);

    expect(
      matchesThemePresetFilters("open-events", presets, {
        query: "custom",
        typeFilter: "all",
        statusFilter: "all",
        eventQueueFilter: "open",
        healthFilter: "all",
        impactFilter: "negative",
        sortBy: "attention",
        recentOnly24h: false,
      favoritesOnly: false,
      }),
    ).toBe(false);
  });
});
