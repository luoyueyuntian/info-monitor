import type { ThemeSummary } from "../../../lib/api";
import type { RouteLocationRaw } from "vue-router";
import { impactToneLabel, themeImpactTone } from "../../../lib/impact";
import {
  hasRecentThemeActivity,
  themeAttentionScore,
  themeLatestBookmarkedScore,
  themePriorityScore,
} from "../../../lib/theme-ranking";
import { toTimestamp } from "../../../lib/time";

export type ThemesBoardFilters = {
  query: string;
  typeFilter: string;
  eventQueueFilter: string;
  healthFilter: string;
  impactFilter: string;
  sortBy: string;
  recentOnly24h: boolean;
};

export type ThemeWorkspaceActions = {
  summary: string;
  actions: Array<{
    label: string;
    to: RouteLocationRaw;
  }>;
};

export type ThemeDiagnostics = {
  tone: string;
  toneLabel: string;
  headline: string;
  summary: string;
  priorityItems: string[];
  actions: Array<{
    label: string;
    to: RouteLocationRaw;
  }>;
};

export function filterThemes(themes: ThemeSummary[], filters: ThemesBoardFilters) {
  return [...themes]
    .filter((theme) => {
      const matchesQuery =
        !filters.query ||
        theme.name.toLowerCase().includes(filters.query.toLowerCase()) ||
        theme.type.toLowerCase().includes(filters.query.toLowerCase());
      const matchesType = filters.typeFilter === "all" || theme.type === filters.typeFilter;
      const matchesQueue =
        filters.eventQueueFilter === "all" ||
        (filters.eventQueueFilter === "open" && (theme.openEventCount ?? 0) > 0) ||
        (filters.eventQueueFilter === "tracking" && (theme.trackingEventCount ?? 0) > 0) ||
        (filters.eventQueueFilter === "unread" && (theme.unreadEventCount ?? 0) > 0) ||
        (filters.eventQueueFilter === "bookmarked" && (theme.bookmarkedEventCount ?? 0) > 0) ||
        (
          filters.eventQueueFilter === "ignored" &&
          (theme.ignoredEventCount ?? 0) > 0 &&
          (theme.openEventCount ?? 0) === 0 &&
          (theme.trackingEventCount ?? 0) === 0
        );
      const matchesHealth =
        filters.healthFilter === "all" || (theme.sourceHealth ?? "healthy") === filters.healthFilter;
      const matchesImpact = filters.impactFilter === "all" || themeImpactTone(theme) === filters.impactFilter;
      const matchesRecent = !filters.recentOnly24h || hasRecentThemeActivity(theme);

      return matchesQuery && matchesType && matchesQueue && matchesHealth && matchesImpact && matchesRecent;
    })
    .sort((left, right) => {
      if (filters.sortBy === "latestEvent") {
        return toTimestamp(right.latestEventAt) - toTimestamp(left.latestEventAt);
      }

      if (filters.sortBy === "latestRun") {
        return toTimestamp(right.latestRunAt) - toTimestamp(left.latestRunAt);
      }

      if (filters.sortBy === "latestBookmarked") {
        return themeLatestBookmarkedScore(right) - themeLatestBookmarkedScore(left);
      }

      if (filters.sortBy === "name") {
        return left.name.localeCompare(right.name, "zh-CN");
      }

      if (filters.sortBy === "attention") {
        return themeAttentionScore(right) - themeAttentionScore(left);
      }

      return themePriorityScore(right) - themePriorityScore(left);
    });
}

export function buildThemeFilterSummary(
  filters: ThemesBoardFilters,
  themeTypeLabel: (type: string) => string,
) {
  const parts = [
    filters.query ? `搜索“${filters.query}”` : "",
    filters.typeFilter !== "all" ? `类型 ${themeTypeLabel(filters.typeFilter)}` : "",
    filters.eventQueueFilter === "open" ? "有待处理事件" : "",
    filters.eventQueueFilter === "tracking" ? "有关注中事件" : "",
    filters.eventQueueFilter === "ignored" ? "仅已忽略事件" : "",
    filters.eventQueueFilter === "unread" ? "有未读事件" : "",
    filters.eventQueueFilter === "bookmarked" ? "有收藏事件" : "",
    filters.healthFilter === "warning" ? "只看异常来源主题" : "",
    filters.impactFilter === "positive" ? "影响 偏利好" : "",
    filters.impactFilter === "negative" ? "影响 偏利空" : "",
    filters.impactFilter === "neutral" ? "影响 中性" : "",
    filters.recentOnly24h ? "最近24小时更新" : "",
    filters.sortBy === "attention" ? "按优先处理排序" : "",
    filters.sortBy === "latestEvent" ? "按最近事件排序" : "",
    filters.sortBy === "latestRun" ? "按最近运行排序" : "",
    filters.sortBy === "latestBookmarked" ? "按最近收藏排序" : "",
    filters.sortBy === "name" ? "按名称排序" : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "全部主题，按优先级排序";
}

export function buildThemeDiagnostics(visibleThemes: ThemeSummary[]) {
  const warningCount = visibleThemes.filter((theme) => theme.sourceHealth === "warning").length;
  const pausedCount = visibleThemes.filter((theme) => theme.status === "paused").length;
  const recentCount = visibleThemes.filter((theme) => hasRecentThemeActivity(theme)).length;
  const positiveCount = visibleThemes.filter((theme) => themeImpactTone(theme) === "positive").length;
  const negativeCount = visibleThemes.filter((theme) => themeImpactTone(theme) === "negative").length;
  const neutralCount = visibleThemes.length - positiveCount - negativeCount;
  const impactSummary = `影响判断上共有 ${positiveCount} 个偏利好主题、${negativeCount} 个偏利空主题、${neutralCount} 个中性主题。`;
  const priorityItems = [...visibleThemes]
    .sort((left, right) => themeAttentionScore(right) - themeAttentionScore(left))
    .filter((theme) => themeAttentionScore(theme) > 0)
    .slice(0, 3)
    .map((theme) => {
      if (theme.sourceHealth === "warning") {
        return `${theme.name}：来源异常，建议先复核抓取链路和最新结果。`;
      }

      if ((theme.openEventCount ?? 0) > 0) {
        return `${theme.name}：当前有 ${theme.openEventCount} 条待处理事件，建议优先清理。`;
      }

      if ((theme.unreadEventCount ?? 0) > 0) {
        return `${theme.name}：当前仍有 ${theme.unreadEventCount} 条未读事件，适合先快速巡检。`;
      }

      if ((theme.bookmarkedEventCount ?? 0) > 0) {
        return `${theme.name}：当前有 ${theme.bookmarkedEventCount} 条收藏事件，适合作为重点回看对象。`;
      }

      if (theme.latestEventSignal === "30d_low") {
        return `${theme.name}：出现新低类信号，适合优先确认是否值得跟进。`;
      }

      if (themeImpactTone(theme) === "negative") {
        return `${theme.name}：当前最新信号偏利空，建议优先确认是否需要调整判断。`;
      }

      if (themeImpactTone(theme) === "positive") {
        return `${theme.name}：当前最新信号偏利好，适合优先确认机会是否成立。`;
      }

      if (theme.latestEventSignal === "content_update") {
        return `${theme.name}：最近抓到新的内容更新，适合优先判断影响范围和后续动作。`;
      }

      if (theme.latestEventSignal === "new_financial_event" || theme.latestEventSignal === "new_announcement") {
        return `${theme.name}：最近有新的关键事件，建议优先阅读并更新判断。`;
      }

      return `${theme.name}：最近有更新，建议优先查看最新变化。`;
    });

  if (warningCount > 0) {
    return {
      tone: "warning",
      toneLabel: "优先处理异常",
      headline: "当前主题里存在明显异常，建议先处理来源问题再继续判断主题价值。",
      summary: `当前筛选结果里有 ${warningCount} 个异常主题、${pausedCount} 个暂停主题、${recentCount} 个最近24小时有更新的主题。${impactSummary}`,
      priorityItems: priorityItems.length ? priorityItems : ["当前异常主题需要优先复核来源状态和最近结果。"],
      actions: [
        {
          label: "查看异常主题",
          to: { path: "/themes", query: { health: "warning", sort: "attention" } },
        },
        {
          label: "查看异常来源状态",
          to: { path: "/sources/status", query: { focus: "warning", recent: "24h" } },
        },
        {
          label: "查看最近更新主题",
          to: { path: "/themes", query: { recent: "24h", sort: "latestEvent" } },
        },
      ],
    } satisfies ThemeDiagnostics;
  }

  const openCount = visibleThemes.reduce((sum, theme) => sum + (theme.openEventCount ?? 0), 0);
  const trackingCount = visibleThemes.reduce((sum, theme) => sum + (theme.trackingEventCount ?? 0), 0);
  const unreadCount = visibleThemes.reduce((sum, theme) => sum + (theme.unreadEventCount ?? 0), 0);
  const bookmarkedCount = visibleThemes.reduce((sum, theme) => sum + (theme.bookmarkedEventCount ?? 0), 0);

  if (openCount > 0 || trackingCount > 0 || unreadCount > 0 || bookmarkedCount > 0) {
    return {
      tone: "pending",
      toneLabel: "有处理压力",
      headline: "当前主题里已经积累了待处理、未读或收藏事件，建议按处理压力继续推进。",
      summary: `当前筛选结果里共有 ${openCount} 条待处理事件、${trackingCount} 条关注中事件、${unreadCount} 条未读事件、${bookmarkedCount} 条收藏事件。${impactSummary}`,
      priorityItems: priorityItems.length ? priorityItems : ["优先查看待处理事件较多的主题，避免判断堆积。"],
      actions: [
        openCount > 0
          ? {
              label: "处理待处理主题",
              to: { path: "/themes", query: { queue: "open", sort: "attention" } },
            }
          : unreadCount > 0
            ? {
                label: "回看未读主题",
                to: { path: "/themes", query: { queue: "unread", sort: "attention" } },
              }
            : {
                label: "回看关注中主题",
                to: { path: "/themes", query: { queue: "tracking", sort: "attention" } },
              },
        {
          label: "查看相关事件工作台",
          to: {
            path: "/events",
            query: {
              status: openCount > 0 ? "open" : trackingCount > 0 ? "tracking" : undefined,
              read: unreadCount > 0 ? "unread" : undefined,
              impact: filtersImpactFromThemes(visibleThemes),
              sort: openCount > 0 ? "statusChanged" : "occurredAt",
            },
          },
        },
        {
          label: "查看来源状态",
          to: { path: "/sources/status", query: { recent: "24h" } },
        },
      ],
    } satisfies ThemeDiagnostics;
  }

  if (recentCount > 0 || pausedCount > 0) {
    return {
      tone: "pending",
      toneLabel: "值得继续跟进",
      headline: "当前主题整体可用，但最近有更新或状态变化，适合继续跟进。",
      summary: `当前筛选结果里有 ${recentCount} 个最近24小时更新主题、${pausedCount} 个暂停主题。${impactSummary}`,
      priorityItems: priorityItems.length ? priorityItems : ["优先看最近有新信号或最近刚运行过的主题。"],
      actions: [
        {
          label: "查看最近更新主题",
          to: { path: "/themes", query: { recent: "24h", sort: "latestEvent" } },
        },
        pausedCount > 0
          ? {
              label: "查看暂停主题来源",
              to: { path: "/sources/status", query: { focus: "all", recent: "24h" } },
            }
          : {
              label: "查看最近24小时事件",
              to: { path: "/events", query: { recent: "24h", impact: filtersImpactFromThemes(visibleThemes), sort: "occurredAt" } },
            },
        {
          label: "查看主题中心成组处理",
          to: { path: "/themes", query: { impact: filtersImpactFromThemes(visibleThemes), sort: "attention" } },
        },
      ],
    } satisfies ThemeDiagnostics;
  }

  return {
    tone: "healthy",
    toneLabel: "整体稳定",
    headline: "当前主题整体状态稳定，暂时没有特别紧急的处理项。",
    summary: `当前筛选结果里共 ${visibleThemes.length} 个主题，整体以持续观察为主。${impactSummary}`,
    priorityItems: ["当前更适合按主题价值和个人关注度安排后续查看顺序。"],
    actions: [
      {
        label: "查看最近24小时事件",
        to: { path: "/events", query: { recent: "24h", impact: filtersImpactFromThemes(visibleThemes), sort: "occurredAt" } },
      },
      {
        label: "查看主题中心",
        to: { path: "/themes", query: { impact: filtersImpactFromThemes(visibleThemes), sort: "attention" } },
      },
      {
        label: "查看来源状态",
        to: { path: "/sources/status", query: { recent: "24h" } },
      },
    ],
  } satisfies ThemeDiagnostics;
}

export function buildThemeComparisons(visibleThemes: ThemeSummary[]) {
  const candidates = [
    { type: "price", label: "价格主题" },
    { type: "content_update", label: "内容更新主题" },
    { type: "financial_event", label: "金融事件主题" },
    { type: "news_announcement", label: "公告主题" },
  ];

  return candidates.map((candidate) => {
    const themesOfType = visibleThemes
      .filter((theme) => theme.type === candidate.type)
      .sort((left, right) => themeAttentionScore(right) - themeAttentionScore(left));
    const topTheme = themesOfType[0];

    if (!topTheme) {
      return {
        ...candidate,
        theme: null,
        summary: "当前筛选范围里没有这个类型的主题可供比较。",
      };
    }

    let summary = "当前更适合作为横向比较时的优先查看对象。";

    if (topTheme.sourceHealth === "warning") {
      summary = "来源状态异常，优先处理后再继续判断其价值。";
    } else if (topTheme.latestEventSignal === "30d_low") {
      summary = "最近出现了低价类信号，适合优先确认是否值得跟进。";
    } else if (themeImpactTone(topTheme) === "negative") {
      summary = `当前最新信号${impactToneLabel(themeImpactTone(topTheme))}，建议优先确认是否需要调整判断。`;
    } else if (themeImpactTone(topTheme) === "positive") {
      summary = `当前最新信号${impactToneLabel(themeImpactTone(topTheme))}，适合优先确认机会是否成立。`;
    } else if (topTheme.latestEventSignal === "content_update") {
      summary = "最近抓到新的内容更新，适合优先判断影响范围和后续动作。";
    } else if (topTheme.latestEventSignal === "new_financial_event" || topTheme.latestEventSignal === "new_announcement") {
      summary = "最近有新的关键事件，适合优先阅读并更新判断。";
    } else if (hasRecentThemeActivity(topTheme)) {
      summary = "最近刚更新，适合优先查看是否有新变化。";
    }

    return {
      ...candidate,
      theme: topTheme,
      summary,
    };
  });
}

export function buildThemeWorkspaceActions(
  visibleThemes: ThemeSummary[],
  filters: ThemesBoardFilters,
) {
  if (!visibleThemes.length) {
    return null;
  }

  const topTheme = [...visibleThemes].sort((left, right) => themeAttentionScore(right) - themeAttentionScore(left))[0];
  const topImpact = themeImpactTone(topTheme);
  const eventImpact =
    filters.impactFilter !== "all" ? filters.impactFilter : topImpact !== "neutral" ? topImpact : undefined;

  return {
    summary: `当前筛选结果里共有 ${visibleThemes.length} 个主题，优先处理对象是 ${topTheme.name}。`,
    actions: [
      {
        label:
          (topTheme.openEventCount ?? 0) > 0
            ? `处理 ${topTheme.name} 事件`
            : topTheme.sourceHealth === "warning"
              ? `排查 ${topTheme.name} 来源`
              : topTheme.type === "price"
                ? `查看 ${topTheme.name} 趋势`
                : `查看 ${topTheme.name} 分析`,
        to:
          (topTheme.openEventCount ?? 0) > 0
            ? { path: `/themes/${topTheme.id}`, query: { section: "events" } }
            : topTheme.sourceHealth === "warning"
              ? { path: "/sources/status", query: { themeId: topTheme.id, focus: "warning" } }
              : topTheme.type === "price"
                ? { path: `/themes/${topTheme.id}`, query: { section: "trend" } }
                : { path: `/themes/${topTheme.id}`, query: { section: "analysis" } },
      },
      {
        label: `查看 ${topTheme.name} 来源状态`,
        to: { path: "/sources/status", query: { themeId: topTheme.id } },
      },
      {
        label: `查看 ${topTheme.name} 相关事件`,
        to: {
          path: "/events",
          query: {
            themeId: topTheme.id,
            impact: eventImpact,
            status: (topTheme.openEventCount ?? 0) > 0 ? "open" : undefined,
            sort: (topTheme.openEventCount ?? 0) > 0 ? "statusChanged" : "occurredAt",
          },
        },
      },
    ],
  } satisfies ThemeWorkspaceActions;
}

function filtersImpactFromThemes(themes: ThemeSummary[]) {
  const negativeCount = themes.filter((theme) => themeImpactTone(theme) === "negative").length;
  const positiveCount = themes.filter((theme) => themeImpactTone(theme) === "positive").length;

  if (negativeCount > 0 && positiveCount === 0) {
    return "negative";
  }

  if (positiveCount > 0 && negativeCount === 0) {
    return "positive";
  }

  return undefined;
}
