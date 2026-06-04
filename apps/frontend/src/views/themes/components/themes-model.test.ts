import { describe, expect, it } from "vitest";

import type { ThemeSummary } from "../../../lib/api";
import {
  buildThemeComparisons,
  buildThemeDiagnostics,
  buildThemeFilterSummary,
  filterThemes,
} from "./themes-model";

const makeTheme = (overrides: Partial<ThemeSummary> = {}): ThemeSummary => ({
  id: "theme_1",
  name: "PBOC Open Market",
  type: "financial_event",
  status: "active",
  latestRunAt: "2026-01-02T00:00:00.000Z",
  latestEventAt: "2026-01-02T01:00:00.000Z",
  sourceCount: 1,
  sourceHealth: "healthy",
  openEventCount: 0,
  trackingEventCount: 0,
  ignoredEventCount: 0,
  unreadEventCount: 0,
  bookmarkedEventCount: 0,
  ...overrides,
});

describe("themes-model", () => {
  it("filters themes by queue, health, query and sort", () => {
    const themes = [
      makeTheme({ id: "t1", name: "A", type: "price", openEventCount: 1, latestEventAt: "2026-01-02T05:00:00.000Z" }),
      makeTheme({ id: "t2", name: "B", type: "price", openEventCount: 0, sourceHealth: "warning" }),
      makeTheme({ id: "t3", name: "C", type: "financial_event", openEventCount: 2, latestEventAt: "2026-01-02T06:00:00.000Z" }),
    ];

    const result = filterThemes(themes, {
      query: "",
      typeFilter: "all",
      eventQueueFilter: "open",
      healthFilter: "all",
      sortBy: "latestEvent",
      recentOnly24h: false,
    });

    expect(result.map((item) => item.id)).toEqual(["t3", "t1"]);
  });

  it("builds a readable filter summary", () => {
    expect(
      buildThemeFilterSummary(
        {
          query: "pbc",
          typeFilter: "financial_event",
          eventQueueFilter: "bookmarked",
          healthFilter: "warning",
          sortBy: "attention",
          recentOnly24h: true,
        },
        (value) => value,
      ),
    ).toContain("搜索“pbc”");
  });

  it("builds warning diagnostics when warning themes exist", () => {
    const diagnostics = buildThemeDiagnostics([
      makeTheme({ id: "t1", sourceHealth: "warning" }),
      makeTheme({ id: "t2", openEventCount: 2 }),
    ]);

    expect(diagnostics.tone).toBe("warning");
    expect(diagnostics.summary).toContain("异常主题");
  });

  it("builds comparison cards by theme type", () => {
    const comparisons = buildThemeComparisons([
      makeTheme({ id: "t1", type: "price", latestEventSignal: "30d_low" }),
      makeTheme({ id: "t2", type: "news_announcement", latestEventSignal: "new_announcement" }),
    ]);

    expect(comparisons).toHaveLength(3);
    expect(comparisons[0].theme?.id).toBe("t1");
    expect(comparisons[1].theme).toBeNull();
  });
});
