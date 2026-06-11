import { describe, expect, it } from "vitest";

import type { ThemeDetail } from "../../../../lib/api";
import { buildThemeDetailAnalysisActions } from "./theme-detail-analysis-actions";

const makeDetail = (overrides: Partial<ThemeDetail> = {}): ThemeDetail => ({
  theme: {
    id: "theme_1",
    name: "Theme One",
    type: "price",
    status: "active",
    latestInsight: "3999 · CNY · 16G+512G",
  },
  sources: [
    {
      id: "source_1",
      name: "Source One",
      status: "healthy",
      latestSuccessAt: "2026-01-02T00:00:00.000Z",
      latestFailureAt: null,
    },
  ],
  events: [
    {
      id: "event_1",
      title: "Price low",
      signal: "30d_low",
      status: "open",
      isRead: false,
      isBookmarked: true,
      occurredAt: "2026-01-02T01:00:00.000Z",
      summary: "summary",
    },
  ],
  history: [],
  breakdown: null,
  timeline: [],
  records: [],
  analysis: {
    tone: "negative",
    headline: "近期信号偏谨慎",
    summary: "summary",
    keyPoints: [],
    risks: [],
    actions: [],
    recentChange: { headline: "h", summary: "s", highlights: [] },
    trend: { headline: "h", summary: "s", highlights: [] },
  },
  ...overrides,
});

describe("theme-detail-analysis-actions", () => {
  it("builds action shortcuts from current theme state", () => {
    const actions = buildThemeDetailAnalysisActions(
      makeDetail({
        sources: [
          {
            id: "source_1",
            name: "Source One",
            status: "healthy",
            latestSuccessAt: "2026-01-02T00:00:00.000Z",
            latestFailureAt: null,
          },
          {
            id: "source_2",
            name: "Source Two",
            status: "healthy",
            latestSuccessAt: "2026-01-02T00:10:00.000Z",
            latestFailureAt: null,
          },
        ],
      }),
    );

    expect(actions).toEqual([
      { label: "先处理待处理事件", to: { path: "/themes/theme_1", query: { section: "events" } } },
      { label: "优先回看主题时间线", to: { path: "/themes/theme_1", query: { section: "timeline" } } },
      { label: "查看主题时间线", to: { path: "/themes/theme_1", query: { section: "timeline" } } },
      { label: "查看跨来源快照", to: { path: "/themes/theme_1", query: { section: "compare" } } },
    ]);
  });

  it("prefers source review when negative tone also has warning source", () => {
    const actions = buildThemeDetailAnalysisActions(
      makeDetail({
        sources: [
          {
            id: "source_1",
            name: "Source One",
            status: "warning",
            latestSuccessAt: "2026-01-02T00:00:00.000Z",
            latestFailureAt: "2026-01-02T01:00:00.000Z",
          },
        ],
      }),
    );

    expect(actions[1]).toEqual({
      label: "先检查来源状态",
      to: { path: "/themes/theme_1", query: { section: "sources" } },
    });
  });
});
