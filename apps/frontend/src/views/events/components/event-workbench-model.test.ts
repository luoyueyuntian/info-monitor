import { describe, expect, it } from "vitest";

import type { EventSummary } from "../../../lib/api";
import {
  buildEventDiagnostics,
  buildEventFilterSummary,
  buildEventThemeBuckets,
  buildEventThemeOptions,
  buildEventWorkspaceActions,
  filterWorkbenchEvents,
} from "./event-workbench-model";

const makeEvent = (overrides: Partial<EventSummary> = {}): EventSummary => ({
  id: "event_1",
  themeId: "theme_1",
  themeName: "Theme One",
  title: "Open Market Update",
  signal: "new_financial_event",
  status: "open",
  isRead: false,
  isBookmarked: false,
  occurredAt: "2026-01-02T01:00:00.000Z",
  summary: "summary",
  infoType: "financial_event",
  ...overrides,
});

describe("event-workbench-model", () => {
  it("builds theme options from unique event themes", () => {
    const options = buildEventThemeOptions([
      makeEvent({ themeId: "theme_2", themeName: "Theme Two" }),
      makeEvent({ themeId: "theme_1", themeName: "Theme One" }),
      makeEvent({ themeId: "theme_2", themeName: "Theme Two" }),
    ]);

    expect(options).toEqual([
      { id: "theme_1", name: "Theme One" },
      { id: "theme_2", name: "Theme Two" },
    ]);
  });

  it("filters events by multiple dimensions", () => {
    const events = [
      makeEvent({ id: "e1", status: "open", isRead: false }),
      makeEvent({ id: "e2", status: "tracking", isRead: true, title: "Macro Update" }),
      makeEvent({ id: "e3", themeId: "theme_2", themeName: "Theme Two", status: "open", isBookmarked: true }),
    ];

    const result = filterWorkbenchEvents(events, {
      query: "",
      themeFilter: "theme_2",
      statusFilter: "open",
      typeFilter: "all",
      impactFilter: "all",
      readFilter: "all",
      bookmarkFilter: "bookmarked",
      sortBy: "occurredAt",
      recentOnly24h: false,
      sinceFilter: "",
    });

    expect(result.map((item) => item.id)).toEqual(["e3"]);
  });

  it("builds warning diagnostics when open events exist", () => {
    const diagnostics = buildEventDiagnostics(
      [makeEvent({ status: "open" }), makeEvent({ id: "e2", status: "tracking" })],
      (status) => String(status ?? "open"),
    );

    expect(diagnostics.tone).toBe("warning");
    expect(diagnostics.summary).toContain("待处理事件");
  });

  it("groups events into theme buckets", () => {
    const buckets = buildEventThemeBuckets([
      makeEvent({ id: "e1", themeId: "t1", themeName: "T1", status: "open", infoType: "price", signal: "30d_low" }),
      makeEvent({ id: "e2", themeId: "t1", themeName: "T1", status: "tracking", isRead: false, infoType: "price", signal: "30d_low" }),
      makeEvent({ id: "e3", themeId: "t2", themeName: "T2", status: "ignored", isBookmarked: true }),
    ]);

    expect(buckets[0].themeId).toBe("t1");
    expect(buckets[0].openCount).toBe(1);
    expect(buckets[0].summary).toContain("新低信号");
  });

  it("builds a readable event filter summary", () => {
    const summary = buildEventFilterSummary(
      {
        query: "macro",
        themeFilter: "theme_2",
        statusFilter: "tracking",
        typeFilter: "financial_event",
        impactFilter: "negative",
        readFilter: "unread",
        bookmarkFilter: "bookmarked",
        sortBy: "statusChanged",
        recentOnly24h: true,
        sinceFilter: "2026-01-01T00:00:00.000Z",
      },
      [{ id: "theme_2", name: "Theme Two" }],
      (value) => String(value),
      (value) => value,
      (value) => String(value),
    );

    expect(summary).toContain("Theme Two");
    expect(summary).toContain("按最近状态变化排序");
    expect(summary).toContain("影响 偏利空");
  });

  it("builds workspace actions around the top event", () => {
    const workspace = buildEventWorkspaceActions(
      [
        makeEvent({ id: "e1", themeId: "t1", themeName: "Theme One", status: "open", signal: "bearish" }),
        makeEvent({ id: "e2", themeId: "t2", themeName: "Theme Two", status: "tracking" }),
      ],
      {
        query: "",
        themeFilter: "all",
        statusFilter: "all",
        typeFilter: "all",
        impactFilter: "all",
        readFilter: "all",
        bookmarkFilter: "all",
        sortBy: "statusChanged",
        recentOnly24h: false,
        sinceFilter: "",
      },
    );

    expect(workspace?.summary).toContain("Open Market Update");
    expect(workspace?.actions[0]).toEqual({
      label: "查看 Theme One 主题",
      to: { path: "/themes/t1", query: { section: "events" } },
    });
    expect(workspace?.actions[1]).toEqual({
      label: "查看 Theme One 来源状态",
      to: { path: "/sources/status", query: { themeId: "t1" } },
    });
  });
});
