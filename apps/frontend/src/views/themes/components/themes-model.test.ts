import { describe, expect, it } from "vitest";

import type { ThemeSummary } from "../../../lib/api";
import {
  buildThemeComparisons,
  buildThemeDiagnostics,
  buildThemeFilterSummary,
  buildThemeWorkspaceActions,
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
      statusFilter: "all",
      eventQueueFilter: "open",
      healthFilter: "all",
      impactFilter: "all",
      sortBy: "latestEvent",
      recentOnly24h: false,
      favoritesOnly: false,
    });

    expect(result.map((item) => item.id)).toEqual(["t3", "t1"]);
  });

  it("builds a readable filter summary", () => {
    expect(
      buildThemeFilterSummary(
        {
          query: "pbc",
          typeFilter: "financial_event",
          statusFilter: "archived",
          eventQueueFilter: "bookmarked",
          healthFilter: "warning",
          impactFilter: "negative",
          sortBy: "attention",
          recentOnly24h: true,
        favoritesOnly: false,
        },
        (value) => value,
      ),
    ).toContain("搜索“pbc”");
  });

  it("sorts bookmarked themes by latest bookmarked time", () => {
    const themes = [
      makeTheme({ id: "t1", bookmarkedEventCount: 1, latestBookmarkedAt: "2026-01-02T02:00:00.000Z" }),
      makeTheme({ id: "t2", bookmarkedEventCount: 1, latestBookmarkedAt: "2026-01-02T05:00:00.000Z" }),
    ];

    const result = filterThemes(themes, {
      query: "",
      typeFilter: "all",
      statusFilter: "all",
      eventQueueFilter: "bookmarked",
      healthFilter: "all",
      impactFilter: "all",
      sortBy: "latestBookmarked",
      recentOnly24h: false,
      favoritesOnly: false,
    });

    expect(result.map((item) => item.id)).toEqual(["t2", "t1"]);
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
      makeTheme({ id: "t1", type: "price", latestEventSignal: "30d_low", sourceCount: 3 }),
      makeTheme({ id: "t-content", type: "content_update", latestEventSignal: "content_update" }),
      makeTheme({ id: "t2", type: "news_announcement", latestEventSignal: "new_announcement" }),
    ]);

    expect(comparisons).toHaveLength(4);
    expect(comparisons[0].theme?.id).toBe("t1");
    expect(comparisons[0].summary).toContain("多个来源");
    expect(comparisons[1].theme?.id).toBe("t-content");
    expect(comparisons[1].summary).toContain("内容更新");
    expect(comparisons[2].theme).toBeNull();
  });

  it("builds workspace actions around the top theme", () => {
    const workspace = buildThemeWorkspaceActions(
      [
        makeTheme({ id: "t1", name: "Theme One", type: "price", sourceCount: 3, latestEventSignal: "30d_low" }),
        makeTheme({ id: "t2", name: "Theme Two", latestEventSignal: "bullish" }),
      ],
      {
        query: "",
        typeFilter: "all",
        statusFilter: "all",
        eventQueueFilter: "all",
        healthFilter: "all",
        impactFilter: "all",
        sortBy: "attention",
        recentOnly24h: false,
      favoritesOnly: false,
      },
    );

    expect(workspace?.summary).toContain("Theme One");
    expect(workspace?.actions[0]).toEqual({
      label: "查看 Theme One 快照",
      to: { path: "/themes/t1", query: { section: "compare" } },
    });
    expect(workspace?.actions[1]).toEqual({
      label: "查看 Theme One 来源状态",
      to: { path: "/sources/status", query: { themeId: "t1" } },
    });
  });

  it("keeps compare entry visible when multi-source price themes also have open events", () => {
    const workspace = buildThemeWorkspaceActions(
      [
        makeTheme({ id: "t1", name: "Theme One", type: "price", sourceCount: 3, latestEventSignal: "30d_low", openEventCount: 2 }),
      ],
      {
        query: "",
        typeFilter: "all",
        statusFilter: "all",
        eventQueueFilter: "all",
        healthFilter: "all",
        impactFilter: "all",
        sortBy: "attention",
        recentOnly24h: false,
      favoritesOnly: false,
      },
    );

    expect(workspace?.actions[0]).toEqual({
      label: "处理 Theme One 事件",
      to: { path: "/themes/t1", query: { section: "events" } },
    });
    expect(workspace?.actions[1]).toEqual({
      label: "查看 Theme One 快照",
      to: { path: "/themes/t1", query: { section: "compare" } },
    });
  });
});
