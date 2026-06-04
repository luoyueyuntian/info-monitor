import { describe, expect, it } from "vitest";

import {
  buildSourceStatusManagedQuery,
  matchesSourceStatusPresetFilters,
  readSourceStatusRouteFilters,
} from "./source-status-query";

describe("source-status-query", () => {
  it("builds canonical source status query", () => {
    expect(
      buildSourceStatusManagedQuery({
        focusFilter: "warning",
        recentOnly24h: true,
        sinceFilter: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      focus: "warning",
      recent: "24h",
      since: "2026-01-01T00:00:00.000Z",
    });
  });

  it("reads route filters with safe fallbacks", () => {
    expect(
      readSourceStatusRouteFilters(
        {
          focus: "pending",
          recent: "24h",
          since: "2026-01-01T00:00:00.000Z",
        },
        () => true,
      ),
    ).toEqual({
      focusFilter: "pending",
      recentOnly24h: true,
      sinceFilter: "2026-01-01T00:00:00.000Z",
    });

    expect(
      readSourceStatusRouteFilters(
        {
          focus: "invalid",
          recent: "nope",
          since: "bad",
        },
        () => false,
      ),
    ).toEqual({
      focusFilter: "all",
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
          recent: true,
        },
      },
    ] as const;

    expect(
      matchesSourceStatusPresetFilters("recent-warning", presets, {
        focusFilter: "warning",
        recentOnly24h: true,
        sinceFilter: "",
      }),
    ).toBe(true);
  });
});
