import type { RouteLocationRaw } from "vue-router";

import type { DashboardSummary, EventSummary, SourceStatus, ThemeSummary } from "../../../lib/api";
import { sourcePriorityScore } from "../../../lib/source-ranking";
import { themePriorityScore } from "../../../lib/theme-ranking";
import { toTimestamp } from "../../../lib/time";

export function buildInboxSectionDigest(
  sectionId: string,
  events: EventSummary[],
  recentCount: number,
  totalCount: number,
) {
  const latestEvent = events[0];

  if (sectionId === "price-signals") {
    return {
      headline: latestEvent?.signal === "30d_low" ? "当前价格信号偏积极" : "当前价格仍以观察为主",
      summary:
        latestEvent?.signal === "30d_low"
          ? "最近已经出现新低类信号，优先核对低价是否真实可成交。"
          : "当前还没有更强的价格触发信号，建议继续观察不同来源的变化。",
      highlights: [
        recentCount > 0 ? `最近24小时新增 ${recentCount} 条价格事件。` : "最近24小时没有新增价格事件。",
        latestEvent ? `最新价格事件：${latestEvent.title}` : "当前没有最新价格事件。",
        totalCount > 0 ? `累计可查看 ${totalCount} 条价格相关事件。` : "当前还没有累计价格事件。",
      ],
      primaryTarget: latestEvent
        ? {
            path: `/themes/${latestEvent.themeId}`,
            query: { section: (latestEvent.status ?? "open") === "open" ? "events" : "trend" },
          }
        : null,
      primaryActionLabel: (latestEvent?.status ?? "open") === "open" ? "查看重点主题待处理事件" : "查看重点主题趋势",
    };
  }

  if (sectionId === "official-releases") {
    return {
      headline: recentCount > 0 ? "近期官方发布值得优先阅读" : "当前以持续跟踪官方发布为主",
      summary:
        recentCount > 0
          ? "最近24小时已有新发布，建议先读正文，再判断是否需要升级关注。"
          : "当前没有新的官方发布信号，建议继续保持监控。",
      highlights: [
        recentCount > 0 ? `最近24小时新增 ${recentCount} 条发布相关事件。` : "最近24小时没有新增发布事件。",
        latestEvent ? `最新发布事件：${latestEvent.title}` : "当前没有最新发布事件。",
        totalCount > 0 ? `累计可查看 ${totalCount} 条官方发布事件。` : "当前还没有累计发布事件。",
      ],
      primaryTarget: latestEvent
        ? {
            path: `/themes/${latestEvent.themeId}`,
            query: { section: (latestEvent.status ?? "open") === "open" ? "events" : "analysis" },
          }
        : null,
      primaryActionLabel: (latestEvent?.status ?? "open") === "open" ? "查看重点主题待处理事件" : "查看重点主题分析",
    };
  }

  return {
    headline: recentCount > 0 ? "近期金融事件判断有更新" : "当前金融事件以历史参考为主",
    summary:
      recentCount > 0
        ? "最近24小时已有新的金融事件，建议结合金额、期限和方向重新判断。"
        : "当前没有新的金融事件，建议继续等待后续公告或来源更新。",
    highlights: [
      recentCount > 0 ? `最近24小时新增 ${recentCount} 条金融事件。` : "最近24小时没有新增金融事件。",
      latestEvent ? `最新金融事件：${latestEvent.title}` : "当前没有最新金融事件。",
      totalCount > 0 ? `累计可查看 ${totalCount} 条金融事件。` : "当前还没有累计金融事件。",
    ],
    primaryTarget: latestEvent
      ? {
          path: `/themes/${latestEvent.themeId}`,
          query: { section: (latestEvent.status ?? "open") === "open" ? "events" : "analysis" },
        }
      : null,
    primaryActionLabel: (latestEvent?.status ?? "open") === "open" ? "查看重点主题待处理事件" : "查看重点主题分析",
  };
}

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
    delta("warningSources") ? `异常来源${delta("warningSources") > 0 ? "增加" : "减少"} ${Math.abs(delta("warningSources"))}` : "",
    delta("pendingSources") ? `待运行来源${delta("pendingSources") > 0 ? "增加" : "减少"} ${Math.abs(delta("pendingSources"))}` : "",
  ].filter(Boolean);

  return parts.length ? `相较上一次首页加载：${parts.join("，")}。` : "相较上一次首页加载，整体处理压力没有明显变化。";
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
  const topWarningSource = [...sources]
    .filter((source) => source.status === "warning" || source.status === "unhealthy")
    .sort((left, right) => sourcePriorityScore(right) - sourcePriorityScore(left))[0];

  if (summary.warningSources > 0 || summary.openEvents >= 5) {
    return {
      tone: "warning",
      toneLabel: "优先处理异常",
      headline: "当前首页同时存在事件积压或来源异常，建议先处理会影响判断质量的部分。",
      summary: `当前有 ${summary.openEvents} 条待处理事件、${summary.warningSources} 个异常来源、${summary.pendingSources} 个待运行来源。`,
      priorityItems: [
        summary.warningSources > 0
          ? `先排查 ${summary.warningSources} 个异常来源，避免后续主题和事件判断建立在失真的抓取结果上。`
          : "当前没有明显来源异常，可以把重点放在事件处理上。",
        summary.openEvents > 0
          ? `当前有 ${summary.openEvents} 条待处理事件压着，建议先清最靠前的一批关键事件。`
          : "当前没有待处理事件积压。",
        topThemeWithOpenEvents
          ? `${topThemeWithOpenEvents.name} 当前仍有 ${(topThemeWithOpenEvents.openEventCount ?? 0)} 条待处理事件。`
          : topThemeWithUnreadEvents
            ? `${topThemeWithUnreadEvents.name} 当前仍有 ${(topThemeWithUnreadEvents.unreadEventCount ?? 0)} 条未读事件。`
            : "当前没有单个主题表现出明显的处理压力。",
      ],
      actions: [
        { label: "去事件工作台处理待处理事件", to: { path: "/events", query: { status: "open", sort: "statusChanged" } } },
        { label: "去来源状态排查异常来源", to: { path: "/sources/status", query: { focus: "warning" } } },
        topThemeWithOpenEvents
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
      summary: `当前有 ${summary.trackingEvents} 条关注中事件、${unreadEvents} 条未读事件、${bookmarkedEvents} 条收藏事件、${summary.pendingSources} 个待运行来源。`,
      priorityItems: [
        summary.trackingEvents > 0
          ? `优先回看 ${summary.trackingEvents} 条关注中事件，确认它们是否还需要继续跟。`
          : unreadEvents > 0
            ? `优先清理 ${unreadEvents} 条未读事件，先完成一轮快速巡检。`
            : "当前没有关注中事件积压。",
        summary.pendingSources > 0
          ? `等待 ${summary.pendingSources} 个待运行来源完成后，再看是否需要人工补跑。`
          : "当前没有待运行来源需要额外等待。",
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
        { label: "查看待运行来源", to: { path: "/sources/status", query: { focus: "pending", recent: "24h" } } },
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
    summary: `当前有 ${summary.activeThemes} 个活跃主题，最近24小时新增 ${summary.recentEvents} 条事件，来源整体运行稳定。`,
    priorityItems: [
      summary.recentEvents > 0
        ? `最近24小时已有 ${summary.recentEvents} 条新事件，适合先从新增信号里找值得继续跟进的主题。`
        : "当前没有新增事件，适合做一轮轻量巡检和基线复核。",
      openThemes > 0
        ? `仍有 ${openThemes} 个主题存在待处理事件，但整体不构成明显积压。`
        : unreadThemes > 0
          ? `仍有 ${unreadThemes} 个主题存在未读事件，适合顺手完成快速巡检。`
          : "当前没有明显的主题处理积压。",
      bookmarkedThemes > 0
        ? `当前有 ${bookmarkedThemes} 个主题包含收藏事件，适合作为长期重点回看对象。`
        : topWarningSource
          ? `${topWarningSource.name} 仍值得顺手复核，但当前不是主要矛盾。`
          : "当前没有高优先级来源故障需要立即处理。",
    ],
    actions: [
      { label: "查看最近24小时事件", to: { path: "/events", query: { recent: "24h", sort: "occurredAt" } } },
      bookmarkedThemes > 0
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
  const sortedThemes = [...themes]
    .filter((theme) => (theme.bookmarkedEventCount ?? 0) > 0)
    .sort((left, right) => {
      if ((right.bookmarkedEventCount ?? 0) !== (left.bookmarkedEventCount ?? 0)) {
        return (right.bookmarkedEventCount ?? 0) - (left.bookmarkedEventCount ?? 0);
      }

      return themePriorityScore(right) - themePriorityScore(left);
    });
  const sortedEvents = [...bookmarkedEvents].sort(
    (left, right) => toTimestamp(right.latestStatusChangedAt ?? right.occurredAt) - toTimestamp(left.latestStatusChangedAt ?? left.occurredAt),
  );
  const topTheme = sortedThemes[0];
  const topEvent = sortedEvents[0];

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
    summary: `当前有 ${sortedThemes.length} 个收藏主题、${sortedEvents.length} 条收藏事件。`,
    priorityItems: [
      topTheme
        ? `${topTheme.name} 当前累计收藏 ${topTheme.bookmarkedEventCount ?? 0} 条事件，适合作为重点长期观察主题。`
        : "当前还没有明确的收藏主题。",
      topEvent
        ? `最近收藏事件是「${topEvent.title}」，适合结合主题详情和时间线继续回看。`
        : "当前还没有明确的收藏事件。",
      sortedThemes.length > 1
        ? `除最高优先级主题外，仍有 ${sortedThemes.length - 1} 个主题值得间隔性复盘。`
        : "当前收藏主题数量不多，适合逐个精细回看。",
    ],
    actions: [
      { label: "查看全部收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", sort: "statusChanged" } } },
      { label: "查看收藏主题", to: { path: "/themes", query: { queue: "bookmarked", sort: "attention" } } },
      topTheme
        ? { label: `查看 ${topTheme.name}`, to: themeDetailTarget(topTheme) }
        : { label: "查看主题中心", to: { path: "/themes", query: { sort: "attention" } } },
    ],
  };
}
