import { describe, expect, it } from "vitest";

import {
  buildEventWorkbenchManagedQuery,
  matchesEventWorkbenchPreset,
  readEventWorkbenchRouteFilters,
} from "./event-workbench-query";

describe("event-workbench-query", () => {
  const themeOptions = [{ id: "theme_1" }, { id: "theme_2" }];

  it("builds managed query from active filters", () => {
    expect(
      buildEventWorkbenchManagedQuery({
        query: "rate",
        themeFilter: "theme_1",
        statusFilter: "open",
        typeFilter: "financial_event",
        impactFilter: "negative",
        readFilter: "unread",
        bookmarkFilter: "bookmarked",
        sortBy: "statusChanged",
        recentOnly24h: true,
        sinceFilter: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      q: "rate",
      themeId: "theme_1",
      status: "open",
      type: "financial_event",
      impact: "negative",
      read: "unread",
      bookmark: "bookmarked",
      sort: "statusChanged",
      recent: "24h",
      since: "2026-01-01T00:00:00.000Z",
    });
  });

  it("reads route filters with validation", () => {
    expect(
      readEventWorkbenchRouteFilters(
        {
          q: "signal",
          themeId: "theme_2",
          status: "tracking",
          type: "price",
          impact: "positive",
          read: "read",
          bookmark: "bookmarked",
          sort: "statusChanged",
          recent: "24h",
          since: "2026-01-01T00:00:00.000Z",
        },
        themeOptions,
        () => true,
      ),
    ).toEqual({
      query: "signal",
      themeFilter: "theme_2",
      statusFilter: "tracking",
      typeFilter: "price",
      impactFilter: "positive",
      readFilter: "read",
      bookmarkFilter: "bookmarked",
      sortBy: "statusChanged",
      recentOnly24h: true,
      sinceFilter: "2026-01-01T00:00:00.000Z",
    });
  });

  it("keeps valid multi-theme context from the route", () => {
    expect(
      readEventWorkbenchRouteFilters(
        {
          themeId: "theme_1,theme_2",
        },
        themeOptions,
        () => true,
      ),
    ).toEqual({
      query: "",
      themeFilter: "theme_1,theme_2",
      statusFilter: "all",
      typeFilter: "all",
      impactFilter: "all",
      readFilter: "all",
      bookmarkFilter: "all",
      sortBy: "occurredAt",
      recentOnly24h: false,
      sinceFilter: "",
    });
  });

  it("matches a preset only when all managed fields align", () => {
    const presets = [
      {
        id: "recent-open",
        filters: {
          query: "",
          theme: "all",
          status: "open",
          type: "all",
          impact: "negative",
          sort: "statusChanged",
          recent: true,
        },
      },
    ] as const;

    expect(
      matchesEventWorkbenchPreset("recent-open", presets, {
        query: "",
        themeFilter: "all",
        statusFilter: "open",
        typeFilter: "all",
        impactFilter: "negative",
        readFilter: "all",
        bookmarkFilter: "all",
        sortBy: "statusChanged",
        recentOnly24h: true,
        sinceFilter: "",
      }),
    ).toBe(true);
  });
});
