/**
 * Weekly summary service.
 *
 * Aggregates the last 7 days of daily summaries into a weekly overview
 * with week-over-week comparison, per-category trends, and warning source recap.
 */

import type { DailySummary } from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { getSummaryHistory } from "./daily-summary-history.js";

export type WeeklySummary = {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  totalEvents: number;
  recentEvents: number;
  items: Array<{
    category: string;
    label: string;
    count: number;
    recentCount: number;
    dailyTrend: number[];
  }>;
  warningSources: Array<{
    id: string;
    name: string;
    themeName: string;
    status: string;
    lastErrorMessage: string | null;
  }>;
  directionBreakdown?: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  dayLabels: string[];
  dominantCategory?: {
    category: string;
    label: string;
    percentage: number;
  };
  weekOverWeekDelta?: {
    totalEventsDelta: number;
    recentEventsDelta: number;
    trend: "up" | "down" | "flat";
  };
  topChanges?: string[];
  topThemesToFollow?: string[];
};

export type WeeklySummaryCompare = {
  thisWeek: WeeklySummary;
  lastWeek: WeeklySummary | null;
  delta: {
    totalEvents: number;
    recentEvents: number;
    newWarningSources: number;
  } | null;
};

function toCstDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

/**
 * Aggregate multiple daily summaries into a weekly summary.
 *
 * IMPORTANT: Daily summary fields have different semantics:
 * - totalEvents / item.count: CUMULATIVE totals (all-time counts as of that day)
 * - recentEvents / item.recentCount: 24-hour window counts (daily new events)
 * - directionBreakdown: CUMULATIVE counts
 *
 * Therefore we must NOT sum cumulative fields across days — that would
 * double-count events. Instead:
 * - totalEvents: use the LATEST daily's value (most recent cumulative count)
 * - item.count: use the LATEST daily's value
 * - recentEvents: sum across days (each day's 24h window is a different period)
 * - item.recentCount: sum across days
 * - dailyTrend: use each day's count for the sparkline (cumulative snapshots)
 * - directionBreakdown: use the LATEST daily's value
 */
function aggregateDailies(dailies: DailySummary[]): WeeklySummary {
  const now = new Date();
  const weekStart = dailies.length > 0 ? dailies[dailies.length - 1].date : toCstDate(now);
  const weekEnd = dailies.length > 0 ? dailies[0].date : toCstDate(now);

  // Dailies are ordered newest-first. The latest daily has the most recent cumulative counts.
  const latestDaily = dailies[0];

  // Sum daily new events (each day's recentCount covers a distinct 24h window)
  let recentEvents = 0;
  for (const daily of dailies) {
    recentEvents += daily.recentEvents;
  }

  // Aggregate items by category
  const categoryMap = new Map<string, { count: number; recentCount: number; dailyTrend: number[]; label: string }>();

  for (const daily of dailies) {
    for (const item of daily.items) {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, { count: 0, recentCount: 0, dailyTrend: [], label: item.label });
      }
      const entry = categoryMap.get(item.category)!;
      // Sum daily new counts (each day's recentCount is a distinct 24h window)
      entry.recentCount += item.recentCount;
      // Record daily count for trend sparkline (cumulative snapshot per day)
      entry.dailyTrend.push(item.count);
    }
  }

  // Overwrite cumulative counts with the latest daily's values
  if (latestDaily) {
    for (const item of latestDaily.items) {
      const entry = categoryMap.get(item.category);
      if (entry) {
        entry.count = item.count; // latest cumulative count
      }
    }
  }

  // Pad daily trends to 7 entries
  for (const entry of categoryMap.values()) {
    while (entry.dailyTrend.length < 7) {
      entry.dailyTrend.push(0);
    }
    entry.dailyTrend.reverse(); // oldest to newest
  }

  // Collect unique warning sources across the week
  const warningSourceMap = new Map<string, WeeklySummary["warningSources"][0]>();
  for (const daily of dailies) {
    for (const src of daily.warningSources) {
      if (!warningSourceMap.has(src.id)) {
        warningSourceMap.set(src.id, { ...src });
      }
    }
  }

  // Direction breakdown: use latest daily's cumulative values
  const latestFinancialItem = latestDaily?.items.find((i) => i.category === "financial-events");
  const directionBreakdown = latestFinancialItem?.directionBreakdown
    ? {
        bullish: latestFinancialItem.directionBreakdown.bullish,
        bearish: latestFinancialItem.directionBreakdown.bearish,
        neutral: latestFinancialItem.directionBreakdown.neutral,
      }
    : undefined;

  // Day labels (oldest to newest)
  const dayLabels = dailies.map((d) => d.date).reverse();
  while (dayLabels.length < 7) {
    const d = new Date(now);
    d.setDate(d.getDate() - (7 - dayLabels.length));
    dayLabels.unshift(toCstDate(d));
  }

  // Detect dominant category (Task 9)
  const items = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    label: data.label,
    count: data.count,
    recentCount: data.recentCount,
    dailyTrend: data.dailyTrend,
  }));

  const totalRecent = items.reduce((sum, item) => sum + item.recentCount, 0);
  let dominantCategory: WeeklySummary["dominantCategory"];
  if (totalRecent > 0 && items.length > 0) {
    const top = items.reduce((max, item) => (item.recentCount > max.recentCount ? item : max), items[0]);
    dominantCategory = {
      category: top.category,
      label: top.label,
      percentage: Math.round((top.recentCount / totalRecent) * 100),
    };
  }

  return {
    generatedAt: now.toISOString(),
    weekStart,
    weekEnd,
    totalEvents: latestDaily?.totalEvents ?? 0, // latest cumulative total, NOT summed
    recentEvents,
    items,
    warningSources: Array.from(warningSourceMap.values()),
    directionBreakdown,
    dayLabels,
    dominantCategory,
    topChanges: buildTopChanges(items, warningSourceMap, dominantCategory),
    topThemesToFollow: buildTopThemesToFollow(items, warningSourceMap),
  };
}

function buildTopChanges(
  items: WeeklySummary["items"],
  warningSources: Map<string, WeeklySummary["warningSources"][0]>,
  dominantCategory: WeeklySummary["dominantCategory"],
): string[] {
  const changes: string[] = [];

  // Top category by new events
  const topByRecent = [...items].sort((a, b) => b.recentCount - a.recentCount)[0];
  if (topByRecent && topByRecent.recentCount > 0) {
    changes.push(`本周最多新增: ${topByRecent.label} (+${topByRecent.recentCount})`);
  }

  // Dominant category
  if (dominantCategory && dominantCategory.percentage >= 50) {
    changes.push(`${dominantCategory.label} 占本周新事件的 ${dominantCategory.percentage}%`);
  }

  // Warning sources
  if (warningSources.size > 0) {
    const names = Array.from(warningSources.values()).map((s) => s.name).slice(0, 3);
    changes.push(`异常来源: ${names.join(", ")}${warningSources.size > 3 ? ` 等${warningSources.size}个` : ""}`);
  }

  return changes.slice(0, 3);
}

function buildTopThemesToFollow(
  items: WeeklySummary["items"],
  warningSources: Map<string, WeeklySummary["warningSources"][0]>,
): string[] {
  const themes: string[] = [];

  // Categories with highest activity
  const activeCategories = items.filter((i) => i.recentCount > 0).sort((a, b) => b.recentCount - a.recentCount);
  for (const cat of activeCategories.slice(0, 2)) {
    themes.push(`${cat.label}: 本周 +${cat.recentCount} 事件`);
  }

  // Themes with warning sources
  const warningThemes = new Set(Array.from(warningSources.values()).map((s) => s.themeName));
  for (const theme of warningThemes) {
    if (themes.length >= 3) break;
    themes.push(`${theme}: 需要关注来源状态`);
  }

  return themes.slice(0, 3);
}

/**
 * Get the weekly summary by aggregating the last 7 daily summaries.
 * Falls back to building from mock data if no history exists.
 */
export async function getWeeklySummary(): Promise<WeeklySummary> {
  const dailies = await getSummaryHistory(7);

  if (dailies.length > 0) {
    return aggregateDailies(dailies.map((s) => s.summary));
  }

  // Fallback: generate a single daily and use that
  const { getDailySummary } = await import("./daily-summary-service.js");
  const today = await getDailySummary();
  return aggregateDailies([today]);
}

/**
 * Get this week vs last week comparison.
 *
 * Delta semantics:
 * - totalEvents: difference of cumulative totals (net new events over the week)
 * - recentEvents: difference of summed daily new events
 * - newWarningSources: difference of unique warning source counts
 */
export async function getWeeklySummaryCompare(): Promise<WeeklySummaryCompare> {
  const thisWeek = await getWeeklySummary();

  // Try to get last week's data (days 8-14)
  const history = await getSummaryHistory(14);
  const lastWeekDailies = history.slice(7);

  let lastWeek: WeeklySummary | null = null;
  let delta: WeeklySummaryCompare["delta"] = null;

  if (lastWeekDailies.length > 0) {
    lastWeek = aggregateDailies(lastWeekDailies.map((s) => s.summary));
    const totalEventsDelta = thisWeek.totalEvents - lastWeek.totalEvents;
    const recentEventsDelta = thisWeek.recentEvents - lastWeek.recentEvents;
    delta = {
      totalEvents: totalEventsDelta, // net new events this week
      recentEvents: recentEventsDelta, // daily new event rate change
      newWarningSources: thisWeek.warningSources.length - lastWeek.warningSources.length,
    };

    // Add week-over-week trend to thisWeek (Task 9)
    thisWeek.weekOverWeekDelta = {
      totalEventsDelta,
      recentEventsDelta,
      trend: recentEventsDelta > 5 ? "up" : recentEventsDelta < -5 ? "down" : "flat",
    };
  }

  return { thisWeek, lastWeek, delta };
}

/**
 * Get weekly review history - browsable list of past weekly summaries.
 * Task 11: Weekly review history browsing.
 */
export async function getWeeklyReviewHistory(weeks: number = 4): Promise<WeeklySummary[]> {
  const dailies = await getSummaryHistory(weeks * 7);

  if (dailies.length === 0) {
    const { getDailySummary } = await import("./daily-summary-service.js");
    const today = await getDailySummary();
    return [aggregateDailies([today])];
  }

  const results: WeeklySummary[] = [];
  for (let i = 0; i < dailies.length; i += 7) {
    const weekDailies = dailies.slice(i, Math.min(i + 7, dailies.length));
    if (weekDailies.length > 0) {
      results.push(aggregateDailies(weekDailies.map((s) => s.summary)));
    }
  }

  return results;
}

/**
 * Export weekly review as text/JSON. Task 11: Export functionality.
 */
export function exportWeeklyReview(
  summary: WeeklySummary,
  format: "text" | "json" = "text",
): string {
  if (format === "json") {
    return JSON.stringify(summary, null, 2);
  }

  // Text format - consistent Chinese language, clean structure
  const lines: string[] = [
    `# 周度回顾: ${summary.weekStart} ~ ${summary.weekEnd}`,
    "",
    `生成时间: ${summary.generatedAt}`,
    "",
    "## 总览",
    `- 累计事件: ${summary.totalEvents}`,
    `- 本周新增: ${summary.recentEvents}`,
    `- 异常来源: ${summary.warningSources.length}`,
    "",
  ];

  // Week-over-week trend
  if (summary.weekOverWeekDelta) {
    const trend = summary.weekOverWeekDelta.trend === "up" ? "↑ 上升" : summary.weekOverWeekDelta.trend === "down" ? "↓ 下降" : "→ 平稳";
    lines.push(`## 趋势判断: ${trend}`);
    lines.push(`- 事件节奏变化: ${summary.weekOverWeekDelta.recentEventsDelta >= 0 ? "+" : ""}${summary.weekOverWeekDelta.recentEventsDelta}`);
    lines.push("");
  }

  // Top changes
  if (summary.topChanges && summary.topChanges.length > 0) {
    lines.push("## 本周重要变化");
    for (const change of summary.topChanges) {
      lines.push(`- ${change}`);
    }
    lines.push("");
  }

  // Top themes to follow
  if (summary.topThemesToFollow && summary.topThemesToFollow.length > 0) {
    lines.push("## 重点关注主题");
    for (const theme of summary.topThemesToFollow) {
      lines.push(`- ${theme}`);
    }
    lines.push("");
  }

  // Dominant category
  if (summary.dominantCategory) {
    lines.push("## 主要类别");
    lines.push(`- ${summary.dominantCategory.label} (占比 ${summary.dominantCategory.percentage}%)`);
    lines.push("");
  }

  // Category breakdown
  lines.push("## 类别明细");
  for (const item of summary.items) {
    lines.push(`- ${item.label}: 累计 ${item.count}，本周新增 ${item.recentCount}`);
  }
  lines.push("");

  // Direction breakdown
  if (summary.directionBreakdown) {
    lines.push("## 方向分布");
    lines.push(`- 看多: ${summary.directionBreakdown.bullish}`);
    lines.push(`- 看空: ${summary.directionBreakdown.bearish}`);
    lines.push(`- 中性: ${summary.directionBreakdown.neutral}`);
    lines.push("");
  }

  // Warning sources
  if (summary.warningSources.length > 0) {
    lines.push("## 异常来源");
    for (const src of summary.warningSources) {
      const errorInfo = src.lastErrorMessage ? ` - ${src.lastErrorMessage}` : "";
      lines.push(`- ${src.name} (${src.themeName}): ${src.status}${errorInfo}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
