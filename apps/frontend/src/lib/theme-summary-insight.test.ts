import { describe, expect, it } from "vitest";

import type { ThemeSummary } from "./api";
import { buildThemeSummaryInsight } from "./theme-summary-insight";

const makeTheme = (overrides: Partial<ThemeSummary> = {}): ThemeSummary => ({
  id: "theme_1",
  name: "Theme One",
  type: "price",
  status: "active",
  latestRunAt: "2026-01-02T00:00:00.000Z",
  latestEventAt: "2026-01-02T01:00:00.000Z",
  sourceCount: 2,
  sourceHealth: "healthy",
  openEventCount: 0,
  trackingEventCount: 0,
  ignoredEventCount: 0,
  unreadEventCount: 0,
  bookmarkedEventCount: 0,
  latestEventSignal: null,
  latestInsight: null,
  latestEventTitle: null,
  ...overrides,
});

describe("theme-summary-insight", () => {
  it("prioritizes warning-source themes", () => {
    const result = buildThemeSummaryInsight(makeTheme({ sourceHealth: "warning" }));

    expect(result.headline).toBe("来源异常需先复核");
  });

  it("explains multi-source price lows", () => {
    const result = buildThemeSummaryInsight(
      makeTheme({ type: "price", sourceCount: 3, latestEventSignal: "30d_low" }),
    );

    expect(result.headline).toBe("多来源快照已出现新低信号");
    expect(result.summary).toContain("连续快照");
  });

  it("explains strengthening financial direction", () => {
    const result = buildThemeSummaryInsight(
      makeTheme({ type: "financial_event", latestEventSignal: "liquidity_injection", sourceCount: 1 }),
    );

    expect(result.headline).toBe("最近流动性方向偏宽松");
  });

  it("keeps open events ahead of generic positive signals", () => {
    const result = buildThemeSummaryInsight(
      makeTheme({ type: "financial_event", latestEventSignal: "liquidity_injection", openEventCount: 2 }),
    );

    expect(result.headline).toBe("当前有待处理方向信号");
  });
});
