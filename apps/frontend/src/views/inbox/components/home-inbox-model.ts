import type { RouteLocationRaw } from "vue-router";

import type { DashboardSummary, EventSummary, SourceStatus, ThemeSummary } from "../../../lib/api";
import { eventImpactTone, impactToneLabel, themeImpactTone } from "../../../lib/impact";
import { sourcePriorityScore } from "../../../lib/source-ranking";
import { buildThemeSummaryInsight } from "../../../lib/theme-summary-insight";
import { themePriorityScore } from "../../../lib/theme-ranking";
import { buildRecentOperationDiagnostic } from "./home-inbox-recent-operation";
import { buildInboxSectionDigest } from "./home-inbox-section-digest";
import {
  buildDiagnosisTrendSummary,
  buildSummaryDeltaMeaning,
  buildSummaryDeltaTarget,
} from "./home-inbox-summary-deltas";
import { toTimestamp } from "../../../lib/time";

function buildInboxThemeQueueMessage(theme: ThemeSummary) {
  const insight = buildThemeSummaryInsight(theme);

  if ((theme.openEventCount ?? 0) > 0) {
    return `${theme.name}：${insight.headline}，${insight.summary}`;
  }

  if ((theme.trackingEventCount ?? 0) > 0) {
    if (theme.type === "financial_event") {
      return `${theme.name}：当前有 ${theme.trackingEventCount} 条关注中金融事件，适合回看最近几轮方向是否继续一致。`;
    }

    if (theme.type === "price" && theme.sourceCount > 1) {
      return `${theme.name}：当前有 ${theme.trackingEventCount} 条关注中价格事件，适合回看最低来源和价差是否还在维持。`;
    }

    return `${theme.name}：当前有 ${theme.trackingEventCount} 条关注中事件，适合回看是否需要继续升级。`;
  }

  if ((theme.unreadEventCount ?? 0) > 0) {
    return `${theme.name}：当前仍有 ${theme.unreadEventCount} 条未读事件，适合先快速巡检。`;
  }

  if ((theme.bookmarkedEventCount ?? 0) > 0) {
    return `${theme.name}：当前有 ${theme.bookmarkedEventCount} 条收藏事件，适合作为重点回看线索。`;
  }

  return `${theme.name}：${insight.headline}，${insight.summary}`;
}

export { buildInboxSectionDigest };

export {
  buildDiagnosisTrendSummary,
  buildRecentOperationDiagnostic,
  buildSummaryDeltaMeaning,
  buildSummaryDeltaTarget,
};

export function buildInboxWorkspaceActions(
  summary: DashboardSummary,
  themes: ThemeSummary[],
  sources: SourceStatus[],
  events: EventSummary[],
) {
  const topOpenTheme = [...themes]
    .filter((theme) => (theme.openEventCount ?? 0) > 0)
    .sort((left, right) => themePriorityScore(right) - themePriorityScore(left))[0];
  const topNegativeTheme = [...themes]
    .filter((theme) => themeImpactTone(theme) === "negative")
    .sort((left, right) => themePriorityScore(right) - themePriorityScore(left))[0];
  const topWarningSource = [...sources]
    .filter((source) => source.status === "warning" || source.status === "unhealthy")
    .sort((left, right) => sourcePriorityScore(right) - sourcePriorityScore(left))[0];
  const topOpenEvent = [...events]
    .filter((event) => (event.status ?? "open") === "open")
    .sort((left, right) => toTimestamp(right.latestStatusChangedAt ?? right.occurredAt) - toTimestamp(left.latestStatusChangedAt ?? left.occurredAt))[0];

  const primaryTheme = topOpenTheme ?? topNegativeTheme ?? themes[0] ?? null;

  if (!primaryTheme && !topWarningSource && !topOpenEvent) {
    return null;
  }

  return {
    summary: `当前首页有 ${summary.openEvents} 条待处理事件、${summary.warningSources} 个异常来源、${summary.recentEvents} 条最近24小时事件，适合从一条主处理链开始推进。`,
    actions: [
      primaryTheme
        ? {
            label: (primaryTheme.openEventCount ?? 0) > 0 ? `处理 ${primaryTheme.name} 主题` : `查看 ${primaryTheme.name} 主题`,
            to: {
              path: `/themes/${primaryTheme.id}`,
              query: {
                section:
                  (primaryTheme.openEventCount ?? 0) > 0
                    ? "events"
                    : themeImpactTone(primaryTheme) === "negative"
                      ? "analysis"
                      : primaryTheme.type === "price"
                        ? "trend"
                        : "timeline",
              },
            },
          }
        : {
            label: "查看主题中心",
            to: { path: "/themes", query: { sort: "attention" } },
          },
      topWarningSource
        ? {
            label: "排查异常来源",
            to: { path: "/sources/status", query: { focus: "warning", themeId: topWarningSource.themeId, recent: "24h" } },
          }
        : {
            label: "查看来源状态",
            to: { path: "/sources/status", query: { recent: "24h" } },
          },
      topOpenEvent
        ? {
            label: "处理待处理事件",
            to: { path: "/events", query: { status: "open", themeId: topOpenEvent.themeId, sort: "statusChanged" } },
          }
        : {
            label: "查看最近24小时事件",
            to: { path: "/events", query: { recent: "24h", sort: "occurredAt" } },
          },
    ],
  };
}

export function buildInboxDiagnosis(
  summary: DashboardSummary,
  themes: ThemeSummary[],
  sources: SourceStatus[],
  themeDetailTarget: (theme: ThemeSummary) => RouteLocationRaw,
) {
  const openThemes = themes.filter((theme) => (theme.openEventCount ?? 0) > 0).length;
  const trackingThemes = themes.filter((theme) => (theme.trackingEventCount ?? 0) > 0).length;
  const unreadThemes = themes.filter((theme) => (theme.unreadEventCount ?? 0) > 0).length;
  const bookmarkedThemes = themes.filter((theme) => (theme.bookmarkedEventCount ?? 0) > 0).length;
  const unreadEvents = themes.reduce((sum, theme) => sum + (theme.unreadEventCount ?? 0), 0);
  const bookmarkedEvents = themes.reduce((sum, theme) => sum + (theme.bookmarkedEventCount ?? 0), 0);
  const topThemeWithOpenEvents = [...themes]
    .filter((theme) => (theme.openEventCount ?? 0) > 0)
    .sort((left, right) => themePriorityScore(right) - themePriorityScore(left))[0];
  const topThemeWithUnreadEvents = [...themes]
    .filter((theme) => (theme.unreadEventCount ?? 0) > 0)
    .sort((left, right) => themePriorityScore(right) - themePriorityScore(left))[0];
  const negativeThemes = [...themes]
    .filter((theme) => themeImpactTone(theme) === "negative")
    .sort((left, right) => themePriorityScore(right) - themePriorityScore(left));
  const positiveThemes = [...themes]
    .filter((theme) => themeImpactTone(theme) === "positive")
    .sort((left, right) => themePriorityScore(right) - themePriorityScore(left));
  const topWarningSource = [...sources]
    .filter((source) => source.status === "warning" || source.status === "unhealthy")
    .sort((left, right) => sourcePriorityScore(right) - sourcePriorityScore(left))[0];

  if (summary.warningSources > 0 || summary.openEvents >= 5) {
    return {
      tone: "warning",
      toneLabel: "优先处理异常",
      headline: "当前首页同时存在事件积压或来源异常，建议先处理会影响判断质量的部分。",
      summary: `当前有 ${summary.openEvents} 条待处理事件、${summary.warningSources} 个异常来源、${summary.pendingSources} 个待运行来源；主题判断上有 ${negativeThemes.length} 个偏利空主题、${positiveThemes.length} 个偏利好主题。`,
      priorityItems: [
        negativeThemes[0]
          ? buildInboxThemeQueueMessage(negativeThemes[0])
          : "当前没有被归为偏利空的主题需要优先复核。",
        summary.warningSources > 0
          ? `先排查 ${summary.warningSources} 个异常来源，避免后续主题和事件判断建立在失真的抓取结果上。`
          : "当前没有明显来源异常，可以把重点放在事件处理上。",
        topThemeWithOpenEvents
          ? `${topThemeWithOpenEvents.name} 当前仍有 ${(topThemeWithOpenEvents.openEventCount ?? 0)} 条待处理事件。`
          : topThemeWithUnreadEvents
            ? `${topThemeWithUnreadEvents.name} 当前仍有 ${(topThemeWithUnreadEvents.unreadEventCount ?? 0)} 条未读事件。`
            : "当前没有单个主题表现出明显的处理压力。",
      ],
      actions: [
        { label: "去事件工作台处理待处理事件", to: { path: "/events", query: { status: "open", sort: "statusChanged" } } },
        { label: "去来源状态排查异常来源", to: { path: "/sources/status", query: { focus: "warning" } } },
        negativeThemes[0]
          ? { label: "查看偏利空主题", to: { path: "/themes", query: { impact: "negative", sort: "attention" } } }
          : topThemeWithOpenEvents
          ? { label: `查看 ${topThemeWithOpenEvents.name}`, to: themeDetailTarget(topThemeWithOpenEvents) }
          : topThemeWithUnreadEvents
            ? { label: `查看 ${topThemeWithUnreadEvents.name}`, to: themeDetailTarget(topThemeWithUnreadEvents) }
            : { label: "查看主题中心优先处理视图", to: { path: "/themes", query: { sort: "attention" } } },
      ],
    };
  }

  if (summary.trackingEvents > 0 || summary.pendingSources > 0 || trackingThemes > 0 || unreadEvents > 0 || bookmarkedEvents > 0) {
    return {
      tone: "pending",
      toneLabel: "继续跟进",
      headline: "当前没有明显故障，但仍有一批事件、未读信号或收藏线索需要继续推进。",
      summary: `当前有 ${summary.trackingEvents} 条关注中事件、${unreadEvents} 条未读事件、${bookmarkedEvents} 条收藏事件、${summary.pendingSources} 个待运行来源；主题判断上有 ${negativeThemes.length} 个偏利空主题、${positiveThemes.length} 个偏利好主题。`,
      priorityItems: [
        negativeThemes[0]
          ? buildInboxThemeQueueMessage(negativeThemes[0])
          : positiveThemes[0]
            ? buildInboxThemeQueueMessage(positiveThemes[0])
            : "当前没有明显偏利空或偏利好的主题需要优先复核。",
        summary.trackingEvents > 0
          ? `优先回看 ${summary.trackingEvents} 条关注中事件，确认它们是否还需要继续跟。`
          : unreadEvents > 0
            ? `优先清理 ${unreadEvents} 条未读事件，先完成一轮快速巡检。`
            : "当前没有关注中事件积压。",
        bookmarkedEvents > 0
          ? `当前有 ${bookmarkedEvents} 条收藏事件，适合作为重点回看线索。`
          : summary.recentEvents > 0
            ? `最近24小时新增 ${summary.recentEvents} 条事件，建议结合主题判断做一轮更新。`
            : "最近24小时没有新增事件，当前主要是回看已有结论。",
      ],
      actions: [
        summary.trackingEvents > 0
          ? { label: "回看关注中事件", to: { path: "/events", query: { status: "tracking", sort: "statusChanged" } } }
          : { label: "回看未读事件", to: { path: "/events", query: { read: "unread", sort: "occurredAt" } } },
        negativeThemes.length > 0
          ? { label: "查看偏利空主题", to: { path: "/themes", query: { impact: "negative", sort: "attention" } } }
          : positiveThemes.length > 0
            ? { label: "查看偏利好主题", to: { path: "/themes", query: { impact: "positive", sort: "attention" } } }
            : { label: "查看待运行来源", to: { path: "/sources/status", query: { focus: "pending", recent: "24h" } } },
        bookmarkedThemes > 0
          ? { label: "打开收藏主题视图", to: { path: "/themes", query: { queue: "bookmarked", sort: "attention" } } }
          : { label: "打开主题中心优先处理视图", to: { path: "/themes", query: { sort: "attention" } } },
      ],
    };
  }

  return {
    tone: "healthy",
    toneLabel: "整体稳定",
    headline: "当前首页没有明显的处理压力，更适合按主题价值和新增信号做主动巡检。",
    summary: `当前有 ${summary.activeThemes} 个活跃主题，最近24小时新增 ${summary.recentEvents} 条事件，来源整体运行稳定；主题判断上有 ${negativeThemes.length} 个偏利空主题、${positiveThemes.length} 个偏利好主题。`,
    priorityItems: [
      negativeThemes[0]
        ? buildInboxThemeQueueMessage(negativeThemes[0])
        : positiveThemes[0]
          ? buildInboxThemeQueueMessage(positiveThemes[0])
          : "当前没有明显偏利空或偏利好的主题需要优先打开。",
      summary.recentEvents > 0
        ? `最近24小时已有 ${summary.recentEvents} 条新事件，适合先从新增信号里找值得继续跟进的主题。`
        : "当前没有新增事件，适合做一轮轻量巡检和基线复核。",
      unreadThemes > 0
          ? `仍有 ${unreadThemes} 个主题存在未读事件，适合顺手完成快速巡检。`
          : openThemes > 0
            ? `仍有 ${openThemes} 个主题存在待处理事件，但整体不构成明显积压。`
            : "当前没有明显的主题处理积压。",
      bookmarkedThemes > 0
        ? `当前有 ${bookmarkedThemes} 个主题包含收藏事件，适合作为长期重点回看对象。`
        : topWarningSource
          ? `${topWarningSource.name} 仍值得顺手复核，但当前不是主要矛盾。`
          : "当前没有高优先级来源故障需要立即处理。",
    ],
    actions: [
      { label: "查看最近24小时事件", to: { path: "/events", query: { recent: "24h", sort: "occurredAt" } } },
      negativeThemes.length > 0
        ? { label: "查看偏利空主题", to: { path: "/themes", query: { impact: "negative", sort: "attention" } } }
        : positiveThemes.length > 0
          ? { label: "查看偏利好主题", to: { path: "/themes", query: { impact: "positive", sort: "attention" } } }
          : bookmarkedThemes > 0
        ? { label: "查看收藏主题", to: { path: "/themes", query: { queue: "bookmarked", sort: "attention" } } }
        : { label: "查看主题中心优先处理视图", to: { path: "/themes", query: { sort: "attention" } } },
      { label: "查看近24小时来源状态", to: { path: "/sources/status", query: { focus: "all", recent: "24h" } } },
    ],
  };
}

export function buildLongTermWatch(
  themes: ThemeSummary[],
  bookmarkedEvents: EventSummary[],
  themeDetailTarget: (theme: ThemeSummary) => RouteLocationRaw,
) {
  const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sortedThemes = [...themes]
    .filter((theme) => (theme.bookmarkedEventCount ?? 0) > 0)
    .sort((left, right) => {
      if ((right.bookmarkedEventCount ?? 0) !== (left.bookmarkedEventCount ?? 0)) {
        return (right.bookmarkedEventCount ?? 0) - (left.bookmarkedEventCount ?? 0);
      }

      return themePriorityScore(right) - themePriorityScore(left);
    });
  const sortedEvents = [...bookmarkedEvents].sort(
    (left, right) => toTimestamp(right.bookmarkedAt ?? right.latestStatusChangedAt ?? right.occurredAt) - toTimestamp(left.bookmarkedAt ?? left.latestStatusChangedAt ?? left.occurredAt),
  );
  const recentThemes = sortedThemes.filter((theme) => toTimestamp(theme.latestBookmarkedAt) >= recentThreshold);
  const steadyThemes = sortedThemes.filter((theme) => toTimestamp(theme.latestBookmarkedAt) > 0 && toTimestamp(theme.latestBookmarkedAt) < recentThreshold);
  const recentEvents = sortedEvents.filter((event) => toTimestamp(event.bookmarkedAt) >= recentThreshold);
  const steadyEvents = sortedEvents.filter((event) => toTimestamp(event.bookmarkedAt) > 0 && toTimestamp(event.bookmarkedAt) < recentThreshold);
  const topTheme = sortedThemes[0];
  const topEvent = sortedEvents[0];
  const negativeThemes = sortedThemes.filter((theme) => themeImpactTone(theme) === "negative");
  const positiveThemes = sortedThemes.filter((theme) => themeImpactTone(theme) === "positive");
  const negativeEvents = sortedEvents.filter((event) => eventImpactTone(event) === "negative");
  const positiveEvents = sortedEvents.filter((event) => eventImpactTone(event) === "positive");

  if (!sortedThemes.length && !sortedEvents.length) {
    return {
      tone: "healthy",
      toneLabel: "尚未建立",
      headline: "当前还没有形成长期观察清单，可以先从真正值得反复回看的事件开始收藏。",
      summary: "收藏更适合承接那些需要跨天、跨周持续观察的线索，而不是当天就能处理完的普通提醒。",
      priorityItems: [
        "遇到值得长期跟踪的价格、公告或金融事件时，可以在事件详情或事件工作台里加入收藏。",
        "当一个主题开始反复出现高价值事件时，再把它沉淀成长期观察对象。",
      ],
      actions: [
        { label: "打开事件工作台寻找可收藏事件", to: { path: "/events", query: { recent: "24h", sort: "occurredAt" } } },
        { label: "查看主题中心优先处理视图", to: { path: "/themes", query: { sort: "attention" } } },
      ],
    };
  }

  return {
    tone: "pending",
    toneLabel: "持续观察中",
    headline: "这部分更像你的长期观察清单，适合在完成每日处理后回看关键主题和重点事件。",
    summary: `当前有 ${sortedThemes.length} 个收藏主题、${sortedEvents.length} 条收藏事件，其中 ${recentThemes.length} 个主题和 ${recentEvents.length} 条事件是最近新加入观察，${steadyThemes.length} 个主题和 ${steadyEvents.length} 条事件已进入持续跟踪；影响判断上共有 ${positiveThemes.length} 个偏利好主题、${negativeThemes.length} 个偏利空主题、${positiveEvents.length} 条偏利好事件、${negativeEvents.length} 条偏利空事件。`,
    priorityItems: [
      negativeThemes[0]
        ? `${negativeThemes[0].name} 当前最新信号${impactToneLabel(themeImpactTone(negativeThemes[0]))}，适合优先确认是否需要调整后续判断。`
        : recentThemes[0]
        ? `${recentThemes[0].name} 最近刚进入长期观察，适合尽快完成首轮回看。`
        : topTheme
          ? `${topTheme.name} 当前累计收藏 ${topTheme.bookmarkedEventCount ?? 0} 条事件，适合作为重点长期观察主题。`
          : "当前还没有明确的收藏主题。",
      negativeEvents[0]
        ? `事件「${negativeEvents[0].title}」当前判断${impactToneLabel(eventImpactTone(negativeEvents[0]))}，适合结合主题详情和时间线优先复核。`
        : topEvent
          ? `最近收藏事件是「${topEvent.title}」，适合结合主题详情和时间线继续回看。`
        : "当前还没有明确的收藏事件。",
      steadyThemes.length > 0
        ? `已有 ${steadyThemes.length} 个主题进入持续跟踪阶段，适合按周或按阶段性变化定期复盘。`
        : sortedThemes.length > 1
          ? `除最高优先级主题外，仍有 ${sortedThemes.length - 1} 个主题值得间隔性复盘。`
          : "当前收藏主题数量不多，适合逐个精细回看。",
    ],
      actions: [
        { label: "打开观察清单", to: { path: "/watchlist" } },
        { label: "查看全部收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", sort: "bookmarkedAt" } } },
        topTheme
          ? { label: `查看 ${topTheme.name}`, to: themeDetailTarget(topTheme) }
          : { label: "查看主题中心", to: { path: "/themes", query: { sort: "attention" } } },
    ],
  };
}
