import { describe, expect, it } from "vitest";

import type { EventDetail } from "../../../../lib/api";
import { buildEventDetailReviewActions } from "./event-detail-review-actions";

const makeDetail = (overrides: Partial<EventDetail> = {}): EventDetail => ({
  id: "event_1",
  themeId: "theme_1",
  themeName: "Theme One",
  title: "Event One",
  signal: "bearish",
  status: "open",
  isRead: false,
  isBookmarked: true,
  occurredAt: "2026-01-02T01:00:00.000Z",
  summary: "summary",
  infoType: "news_announcement",
  evidence: [],
  explanation: {
    headline: "headline",
    impact: "impact",
    whyItMatters: [],
    actions: [],
  },
  ...overrides,
});

describe("event-detail-review-actions", () => {
  it("builds review shortcuts for negative events", () => {
    const actions = buildEventDetailReviewActions(makeDetail());

    expect(actions).toEqual([
      { label: "处理所属主题事件队列", to: { path: "/themes/theme_1", query: { section: "events" } } },
      { label: "优先回看主题分析", to: { path: "/themes/theme_1", query: { section: "analysis" } } },
      { label: "查看主题时间线", to: { path: "/themes/theme_1", query: { section: "timeline" } } },
      { label: "查看所属主题", to: { path: "/themes/theme_1", query: { section: "analysis" } } },
    ]);
  });

  it("uses trend shortcuts for positive price events", () => {
    const actions = buildEventDetailReviewActions(
      makeDetail({
        signal: "30d_low",
        infoType: "price",
      }),
    );

    expect(actions).toContainEqual({
      label: "确认价格趋势是否成立",
      to: { path: "/themes/theme_1", query: { section: "trend" } },
    });
    expect(actions).toContainEqual({
      label: "查看所属主题趋势",
      to: { path: "/themes/theme_1", query: { section: "trend" } },
    });
  });
});
