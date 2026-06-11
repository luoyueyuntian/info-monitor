import { describe, expect, it } from "vitest";

import type { EventSummary } from "../../../lib/api";
import { buildSingleEventOperationNotice } from "./event-operation-feedback";

const makeEvent = (overrides: Partial<EventSummary> = {}): EventSummary => ({
  id: "event_1",
  themeId: "theme_1",
  themeName: "Theme One",
  title: "Price low",
  signal: "30d_low",
  status: "open",
  isRead: false,
  isBookmarked: false,
  occurredAt: "2026-01-02T01:00:00.000Z",
  summary: "summary",
  infoType: "price",
  ...overrides,
});

describe("event-operation-feedback", () => {
  it("builds tracking feedback for price events", () => {
    const notice = buildSingleEventOperationNotice(makeEvent(), "tracking");

    expect(notice.message).toContain("主题趋势");
    expect(notice.actions[0]).toEqual({
      label: "查看 Theme One 趋势",
      to: { path: "/themes/theme_1", query: { section: "trend" } },
    });
  });

  it("builds bookmark feedback for financial events", () => {
    const notice = buildSingleEventOperationNotice(
      makeEvent({
        infoType: "financial_event",
        signal: "liquidity_injection",
      }),
      "bookmark",
    );

    expect(notice.message).toContain("加入收藏");
    expect(notice.actions[0]).toEqual({
      label: "查看观察清单",
      to: { path: "/watchlist" },
    });
  });

  it("adds a homepage follow-up action", () => {
    const notice = buildSingleEventOperationNotice(makeEvent(), "ignored");

    expect(notice.actions[2]).toEqual({
      label: "返回首页查看变化",
      to: { path: "/", query: { focus: "events-price", status: "ignored" } },
    });
  });
});
