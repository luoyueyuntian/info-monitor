import type { ThemeSummary } from "../../../lib/api";
import {
  hasRecentThemeActivity,
  themeAttentionScore,
  themePriorityScore,
} from "../../../lib/theme-ranking";
import { toTimestamp } from "../../../lib/time";

export type ThemesBoardFilters = {
  query: string;
  typeFilter: string;
  eventQueueFilter: string;
  healthFilter: string;
  sortBy: string;
  recentOnly24h: boolean;
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
      const matchesRecent = !filters.recentOnly24h || hasRecentThemeActivity(theme);

      return matchesQuery && matchesType && matchesQueue && matchesHealth && matchesRecent;
    })
    .sort((left, right) => {
      if (filters.sortBy === "latestEvent") {
        return toTimestamp(right.latestEventAt) - toTimestamp(left.latestEventAt);
      }

      if (filters.sortBy === "latestRun") {
        return toTimestamp(right.latestRunAt) - toTimestamp(left.latestRunAt);
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
    filters.recentOnly24h ? "最近24小时更新" : "",
    filters.sortBy === "attention" ? "按优先处理排序" : "",
    filters.sortBy === "latestEvent" ? "按最近事件排序" : "",
    filters.sortBy === "latestRun" ? "按最近运行排序" : "",
    filters.sortBy === "name" ? "按名称排序" : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "全部主题，按优先级排序";
}

export function buildThemeDiagnostics(visibleThemes: ThemeSummary[]) {
  const warningCount = visibleThemes.filter((theme) => theme.sourceHealth === "warning").length;
  const pausedCount = visibleThemes.filter((theme) => theme.status === "paused").length;
  const recentCount = visibleThemes.filter((theme) => hasRecentThemeActivity(theme)).length;
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
      summary: `当前筛选结果里有 ${warningCount} 个异常主题、${pausedCount} 个暂停主题、${recentCount} 个最近24小时有更新的主题。`,
      priorityItems: priorityItems.length ? priorityItems : ["当前异常主题需要优先复核来源状态和最近结果。"],
      actions: [
        "先看异常主题的来源状态，判断是否因为抓取失败导致当前结论不可靠。",
        "处理完异常后，再回到最近有新事件的主题继续做判断。",
      ],
    };
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
      summary: `当前筛选结果里共有 ${openCount} 条待处理事件、${trackingCount} 条关注中事件、${unreadCount} 条未读事件、${bookmarkedCount} 条收藏事件。`,
      priorityItems: priorityItems.length ? priorityItems : ["优先查看待处理事件较多的主题，避免判断堆积。"],
      actions: [
        openCount > 0
          ? "优先进入待处理事件更多的主题，快速清理处理队列。"
          : unreadCount > 0
            ? "优先回看未读事件较多的主题，先完成一轮快速巡检。"
            : "先回看关注中的主题，确认是否需要升级或关闭。",
        "处理完事件状态后，再结合最近变化和趋势判断继续排优先级。",
      ],
    };
  }

  if (recentCount > 0 || pausedCount > 0) {
    return {
      tone: "pending",
      toneLabel: "值得继续跟进",
      headline: "当前主题整体可用，但最近有更新或状态变化，适合继续跟进。",
      summary: `当前筛选结果里有 ${recentCount} 个最近24小时更新主题、${pausedCount} 个暂停主题。`,
      priorityItems: priorityItems.length ? priorityItems : ["优先看最近有新信号或最近刚运行过的主题。"],
      actions: [
        "优先打开最近有新事件的主题，确认当前判断是否需要变化。",
        pausedCount > 0 ? "顺手检查暂停主题是否仍需要暂停，避免长期遗漏。" : "如需更高把握，可按主题价值手动补跑关键来源。",
      ],
    };
  }

  return {
    tone: "healthy",
    toneLabel: "整体稳定",
    headline: "当前主题整体状态稳定，暂时没有特别紧急的处理项。",
    summary: `当前筛选结果里共 ${visibleThemes.length} 个主题，整体以持续观察为主。`,
    priorityItems: ["当前更适合按主题价值和个人关注度安排后续查看顺序。"],
    actions: [
      "继续保持监控，重点关注下一轮新事件或来源状态变化。",
      "如果要主动发现机会，可优先查看最近运行过但暂未产生事件的主题。",
    ],
  };
}

export function buildThemeComparisons(visibleThemes: ThemeSummary[]) {
  const candidates = [
    { type: "price", label: "价格主题" },
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
