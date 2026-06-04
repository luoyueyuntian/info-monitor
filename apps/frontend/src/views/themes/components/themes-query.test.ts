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
        eventQueueFilter: "open",
        healthFilter: "warning",
        sortBy: "latestEvent",
        recentOnly24h: true,
      }),
    ).toEqual({
      q: "pbc",
      type: "news_announcement",
      queue: "open",
      health: "warning",
      sort: "latestEvent",
      recent: "24h",
    });
  });

  it("reads valid route filters and falls back on invalid values", () => {
    expect(
      readThemeRouteFilters({
        q: "macro",
        type: "financial_event",
        queue: "bookmarked",
        health: "warning",
        sort: "attention",
        recent: "24h",
      }),
    ).toEqual({
      query: "macro",
      typeFilter: "financial_event",
      eventQueueFilter: "bookmarked",
      healthFilter: "warning",
      sortBy: "attention",
      recentOnly24h: true,
    });

    expect(
      readThemeRouteFilters({
        q: ["ignored"],
        type: "invalid",
        queue: "invalid",
        health: "invalid",
        sort: "invalid",
      }),
    ).toEqual({
      query: "",
      typeFilter: "all",
      eventQueueFilter: "all",
      healthFilter: "all",
      sortBy: "priority",
      recentOnly24h: false,
    });
  });

  it("matches presets against current filters", () => {
    const presets = [
      {
        id: "open-events",
        filters: {
          query: "",
          type: "all",
          queue: "open",
          health: "all",
          sort: "attention",
          recent: false,
        },
      },
    ] as const;

    expect(
      matchesThemePresetFilters("open-events", presets, {
        query: "",
        typeFilter: "all",
        eventQueueFilter: "open",
        healthFilter: "all",
        sortBy: "attention",
        recentOnly24h: false,
      }),
    ).toBe(true);

    expect(
      matchesThemePresetFilters("open-events", presets, {
        query: "custom",
        typeFilter: "all",
        eventQueueFilter: "open",
        healthFilter: "all",
        sortBy: "attention",
        recentOnly24h: false,
      }),
    ).toBe(false);
  });
});
