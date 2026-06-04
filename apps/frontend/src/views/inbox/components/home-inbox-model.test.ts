import { describe, expect, it } from "vitest";

import type { DashboardSummary, EventSummary, SourceStatus, ThemeSummary } from "../../../lib/api";
import {
  buildDiagnosisTrendSummary,
  buildInboxDiagnosis,
  buildInboxSectionDigest,
  buildLongTermWatch,
} from "./home-inbox-model";

const summary: DashboardSummary = {
  activeThemes: 2,
  openEvents: 3,
  trackingEvents: 1,
  recentEvents: 4,
  warningSources: 1,
  pendingSources: 2,
};

const makeTheme = (overrides: Partial<ThemeSummary> = {}): ThemeSummary => ({
  id: "theme_1",
  name: "Theme One",
  type: "price",
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

const makeEvent = (overrides: Partial<EventSummary> = {}): EventSummary => ({
  id: "event_1",
  themeId: "theme_1",
  themeName: "Theme One",
  title: "Price Low",
  signal: "30d_low",
  status: "open",
  isRead: false,
  isBookmarked: false,
  occurredAt: "2026-01-02T01:00:00.000Z",
  summary: "summary",
  infoType: "price",
  ...overrides,
});

const makeSource = (overrides: Partial<SourceStatus> = {}): SourceStatus => ({
  id: "source_1",
  themeId: "theme_1",
  themeName: "Theme One",
  name: "Source One",
  status: "healthy",
  latestSuccessAt: "2026-01-02T00:00:00.000Z",
  latestFailureAt: null,
  ...overrides,
});

describe("home-inbox-model", () => {
  it("builds trend summary from summary deltas", () => {
    const result = buildDiagnosisTrendSummary(summary, {
      activeThemes: 2,
      openEvents: 1,
      trackingEvents: 1,
      recentEvents: 3,
      warningSources: 0,
      pendingSources: 4,
    });

    expect(result).toContain("待处理事件增加 2");
    expect(result).toContain("异常来源增加 1");
  });

  it("builds inbox section digest for price signals", () => {
    const digest = buildInboxSectionDigest("price-signals", [makeEvent()], 1, 3);

    expect(digest.headline).toContain("价格");
    expect(digest.primaryActionLabel).toContain("查看重点主题");
  });

  it("builds warning inbox diagnosis when warnings exist", () => {
    const diagnosis = buildInboxDiagnosis(
      summary,
      [makeTheme({ openEventCount: 2 })],
      [makeSource({ status: "warning", latestRunStatus: "failed" })],
      (theme) => ({ path: `/themes/${theme.id}` }),
    );

    expect(diagnosis.tone).toBe("warning");
    expect(diagnosis.actions).toHaveLength(3);
  });

  it("builds long-term watch summary from bookmarked themes and events", () => {
    const watch = buildLongTermWatch(
      [makeTheme({ bookmarkedEventCount: 2 })],
      [makeEvent({ isBookmarked: true })],
      (theme) => ({ path: `/themes/${theme.id}` }),
    );

    expect(watch.tone).toBe("pending");
    expect(watch.summary).toContain("收藏主题");
  });
});
