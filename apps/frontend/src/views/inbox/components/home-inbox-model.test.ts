import { describe, expect, it } from "vitest";

import type { DashboardSummary, EventSummary, SourceStatus, ThemeSummary } from "../../../lib/api";
import {
  buildDiagnosisTrendSummary,
  buildInboxDiagnosis,
  buildInboxSectionDigest,
  buildInboxWorkspaceActions,
  buildLongTermWatch,
} from "./home-inbox-model";

const summary: DashboardSummary = {
  activeThemes: 2,
  openEvents: 3,
  trackingEvents: 1,
  unreadEvents: 4,
  bookmarkedEvents: 2,
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
      unreadEvents: 1,
      bookmarkedEvents: 1,
      recentEvents: 3,
      warningSources: 0,
      pendingSources: 4,
    });

    expect(result).toContain("待处理事件增加 2");
    expect(result).toContain("未读事件增加 3");
    expect(result).toContain("异常来源增加 1");
  });

  it("builds inbox section digest for price signals", () => {
    const digest = buildInboxSectionDigest("price-signals", [makeEvent()], 1, 3);

    expect(digest.headline).toContain("价格");
    expect(digest.primaryActionLabel).toContain("查看重点主题");
    expect(digest.highlights.some((item) => item.includes("影响判断"))).toBe(true);
  });

  it("builds warning inbox diagnosis when warnings exist", () => {
    const diagnosis = buildInboxDiagnosis(
      summary,
      [makeTheme({ openEventCount: 2, latestEventSignal: "bearish" })],
      [makeSource({ status: "warning", latestRunStatus: "failed" })],
      (theme) => ({ path: `/themes/${theme.id}` }),
    );

    expect(diagnosis.tone).toBe("warning");
    expect(diagnosis.actions).toHaveLength(3);
    expect(diagnosis.actions[2]).toEqual({
      label: "查看偏利空主题",
      to: { path: "/themes", query: { impact: "negative", sort: "attention" } },
    });
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

  it("builds inbox workspace actions around current pressure", () => {
    const workspace = buildInboxWorkspaceActions(
      summary,
      [makeTheme({ id: "theme_open", name: "Theme Open", openEventCount: 2 })],
      [makeSource({ id: "source_warning", status: "warning", themeId: "theme_open", themeName: "Theme Open" })],
      [makeEvent({ id: "event_open", themeId: "theme_open", themeName: "Theme Open", status: "open" })],
    );

    expect(workspace?.summary).toContain("待处理事件");
    expect(workspace?.actions[0]).toEqual({
      label: "处理 Theme Open 主题",
      to: { path: "/themes/theme_open", query: { section: "events" } },
    });
    expect(workspace?.actions[1]).toEqual({
      label: "排查异常来源",
      to: { path: "/sources/status", query: { focus: "warning", themeId: "theme_open", recent: "24h" } },
    });
  });
});
