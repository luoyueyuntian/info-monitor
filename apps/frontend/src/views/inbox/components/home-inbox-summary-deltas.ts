import type { DashboardSummary } from "../../../lib/api";

export function buildDiagnosisTrendSummary(
  currentSummary: DashboardSummary,
  previousSummary: DashboardSummary | null,
) {
  if (!previousSummary) {
    return "";
  }

  const delta = <K extends keyof DashboardSummary>(key: K) => currentSummary[key] - previousSummary[key];
  const parts = [
    delta("openEvents") ? `待处理事件${delta("openEvents") > 0 ? "增加" : "减少"} ${Math.abs(delta("openEvents"))}` : "",
    delta("unreadEvents") ? `未读事件${delta("unreadEvents") > 0 ? "增加" : "减少"} ${Math.abs(delta("unreadEvents"))}` : "",
    delta("bookmarkedEvents") ? `收藏事件${delta("bookmarkedEvents") > 0 ? "增加" : "减少"} ${Math.abs(delta("bookmarkedEvents"))}` : "",
    delta("warningSources") ? `异常来源${delta("warningSources") > 0 ? "增加" : "减少"} ${Math.abs(delta("warningSources"))}` : "",
    delta("pendingSources") ? `待运行来源${delta("pendingSources") > 0 ? "增加" : "减少"} ${Math.abs(delta("pendingSources"))}` : "",
  ].filter(Boolean);

  return parts.length ? `相较上一次首页加载：${parts.join("，")}。` : "相较上一次首页加载，整体处理压力没有明显变化。";
}

export function buildSummaryDeltaMeaning(
  currentSummary: DashboardSummary,
  previousSummary: DashboardSummary | null,
  key: keyof DashboardSummary,
) {
  if (!previousSummary) {
    return "";
  }

  const delta = currentSummary[key] - previousSummary[key];

  if (!delta) {
    return "";
  }

  if (key === "openEvents") {
    const trackingDelta = currentSummary.trackingEvents - previousSummary.trackingEvents;

    if (delta < 0 && trackingDelta > 0) {
      return "处理推进中";
    }

    return delta > 0 ? "待处理增加" : "待处理减少";
  }

  if (key === "trackingEvents") {
    const openDelta = currentSummary.openEvents - previousSummary.openEvents;

    if (delta > 0 && openDelta < 0) {
      return "转入持续跟进";
    }

    return delta > 0 ? "关注范围扩大" : "关注范围收敛";
  }

  if (key === "unreadEvents") {
    return delta > 0 ? "新线索待巡检" : "首轮巡检推进";
  }

  if (key === "bookmarkedEvents") {
    return delta > 0 ? "新增长期观察" : "长期观察收敛";
  }

  if (key === "recentEvents") {
    return delta > 0 ? "本轮新增信号" : "新增信号回落";
  }

  if (key === "warningSources") {
    return delta > 0 ? "异常扩大" : "异常减少";
  }

  if (key === "pendingSources") {
    return delta > 0 ? "待运行堆积" : "待运行消化";
  }

  if (key === "activeThemes") {
    return delta > 0 ? "新增活跃主题" : "活跃主题减少";
  }

  return "";
}

export function buildSummaryDeltaTarget(
  currentSummary: DashboardSummary,
  previousSnapshot: { capturedAt: string; summary: DashboardSummary } | null,
  key: keyof DashboardSummary,
) {
  if (!previousSnapshot) {
    return null;
  }

  const delta = currentSummary[key] - previousSnapshot.summary[key];
  const since = previousSnapshot.capturedAt;

  if (!delta) {
    return null;
  }

  if (key === "openEvents") {
    if (delta > 0) {
      return { path: "/events", query: { status: "open", sort: "statusChanged", since } };
    }

    if (currentSummary.trackingEvents - previousSnapshot.summary.trackingEvents > 0) {
      return { path: "/events", query: { status: "tracking", sort: "statusChanged", since } };
    }

    return { path: "/events", query: { status: "open", sort: "statusChanged", since } };
  }

  if (key === "trackingEvents") {
    return { path: "/events", query: { status: "tracking", sort: "statusChanged", since } };
  }

  if (key === "unreadEvents") {
    if (delta > 0) {
      return { path: "/events", query: { read: "unread", sort: "occurredAt", since } };
    }

    if (currentSummary.bookmarkedEvents - previousSnapshot.summary.bookmarkedEvents > 0) {
      return { path: "/events", query: { bookmark: "bookmarked", sort: "bookmarkedAt", since } };
    }

    return { path: "/events", query: { read: "unread", sort: "occurredAt", since } };
  }

  if (key === "bookmarkedEvents") {
    return { path: "/events", query: { bookmark: "bookmarked", sort: "bookmarkedAt", since } };
  }

  if (key === "recentEvents") {
    return { path: "/events", query: { recent: "24h", sort: "occurredAt", since } };
  }

  if (key === "warningSources") {
    return { path: "/sources/status", query: { focus: delta > 0 ? "warning" : "all", since } };
  }

  if (key === "pendingSources") {
    return { path: "/sources/status", query: { focus: "pending", since } };
  }

  return null;
}
