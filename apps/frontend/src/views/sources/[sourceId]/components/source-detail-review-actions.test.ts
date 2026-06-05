import { describe, expect, it } from "vitest";

import type { SourceDetail } from "../../../../lib/api";
import { buildSourceDetailReviewActions } from "./source-detail-review-actions";

const makeDetail = (overrides: Partial<SourceDetail> = {}): SourceDetail => ({
  source: {
    id: "source_1",
    themeId: "theme_1",
    themeName: "Theme One",
    themeType: "financial_event",
    latestEventSignal: "bearish",
    name: "Source One",
    status: "warning",
    sourceType: "page_list",
    latestSuccessAt: "2026-01-02T00:00:00.000Z",
    latestFailureAt: "2026-01-02T01:00:00.000Z",
  },
  runs: [],
  events: [
    {
      id: "event_1",
      title: "Event One",
      signal: "bearish",
      status: "open",
      isRead: false,
      isBookmarked: true,
      occurredAt: "2026-01-02T01:00:00.000Z",
      summary: "summary",
    },
  ],
  records: [],
  changes: [],
  snapshots: [],
  analysis: {
    tone: "warning",
    toneLabel: "warning",
    headline: "headline",
    summary: "summary",
    keyPoints: [],
    risks: [],
    actions: [],
  },
  ...overrides,
});

describe("source-detail-review-actions", () => {
  it("builds source detail review shortcuts", () => {
    const actions = buildSourceDetailReviewActions(makeDetail());

    expect(actions).toEqual([
      { label: "查看所属主题事件队列", to: { path: "/themes/theme_1", query: { section: "events" } } },
      { label: "优先回看所属主题分析", to: { path: "/themes/theme_1", query: { section: "analysis" } } },
      { label: "查看所属主题时间线", to: { path: "/themes/theme_1", query: { section: "timeline" } } },
      { label: "查看所属主题", to: { path: "/themes/theme_1", query: { section: "analysis" } } },
    ]);
  });

  it("adds trend shortcut for price themes", () => {
    const actions = buildSourceDetailReviewActions(
      makeDetail({
        source: {
          id: "source_1",
          themeId: "theme_1",
          themeName: "Theme One",
          themeType: "price",
          latestEventSignal: "30d_low",
          name: "Source One",
          status: "healthy",
          sourceType: "page_list",
          latestSuccessAt: "2026-01-02T00:00:00.000Z",
          latestFailureAt: null,
        },
      }),
    );

    expect(actions).toContainEqual({
      label: "查看所属主题趋势",
      to: { path: "/themes/theme_1", query: { section: "trend" } },
    });
  });
});
