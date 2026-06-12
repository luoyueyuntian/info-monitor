/**
 * Source health monitoring service.
 *
 * Provides health statistics and monitoring for data sources,
 * including operational metrics like run duration trends,
 * failure rates, task backlog, and exception aggregation.
 */

import { getDatabase } from "../db/client.js";
import { mockSources } from "../lib/mock-store.js";

// ─── Operational Metrics Types ───────────────────────────────────────────────

export type DailyMetric = {
  date: string;
  value: number;
};

export type OperationalMetrics = {
  /** Run duration trend over the last 7 days (avg ms per day) */
  runDurationTrend: DailyMetric[];
  /** Failure rate trend over the last 7 days (0-1 per day) */
  failureRateTrend: DailyMetric[];
  /** Current task backlog */
  backlog: {
    pendingRuns: number;
    runningRuns: number;
    oldestPendingAge: string | null; // ISO duration string
  };
  /** Recent exception aggregation */
  recentExceptions: Array<{
    errorMessage: string;
    count: number;
    lastOccurredAt: string;
    sourceIds: string[];
  }>;
  /** Hourly run distribution (last 24h) */
  hourlyDistribution: Array<{
    hour: number;
    total: number;
    successful: number;
    failed: number;
  }>;
};

export type SourceHealthStats = {
  totalSources: number;
  healthySources: number;
  warningSources: number;
  pausedSources: number;
  healthRate: number;
  recentRuns: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  averageRunDuration: number | null;
  recentErrors: Array<{
    sourceId: string;
    sourceName: string;
    errorMessage: string;
    occurredAt: string;
  }>;
  sourceDetails: Array<{
    id: string;
    name: string;
    themeName: string;
    status: string;
    isPaused: boolean;
    latestRunStatus: string | null;
    latestRunAt: string | null;
    latestSuccessAt: string | null;
    latestFailureAt: string | null;
    lastErrorMessage: string | null;
    runCount24h: number;
    successCount24h: number;
    failureCount24h: number;
  }>;
};

/**
 * Calculate health score for a source based on its metrics.
 * Score ranges from 0-100:
 * - >80: healthy
 * - 60-80: degraded
 * - <60: unhealthy
 */
export type HealthScoreInput = {
  status: string;
  isPaused?: boolean;
  latestRunStatus?: string | null;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  lastErrorMessage?: string | null;
};

function calculateSourceHealthScore(source: HealthScoreInput): number {
  let score = 100;

  // Factor 1: Latest run status (fetchStatus)
  if (source.latestRunStatus === "failed") {
    score -= 30;
  } else if (source.latestRunStatus === "pending" || source.latestRunStatus === "running") {
    score -= 10;
  }

  // Factor 2: Current status (contentStatus indicator)
  if (source.status === "warning") {
    score -= 25;
  }

  // Factor 3: Consecutive failures (based on latestFailureAt vs latestSuccessAt)
  if (source.latestFailureAt && source.latestSuccessAt) {
    const failureTime = new Date(source.latestFailureAt).getTime();
    const successTime = new Date(source.latestSuccessAt).getTime();
    // If failure is more recent than success, indicates consecutive failures
    if (failureTime > successTime) {
      score -= 20;
    }
  } else if (source.latestFailureAt && !source.latestSuccessAt) {
    // Only failures, no successes
    score -= 40;
  }

  // Factor 4: Error message presence
  if (source.lastErrorMessage) {
    score -= 15;
  }

  // Factor 5: Paused status
  if (source.isPaused) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine health status based on score.
 * - >80: healthy
 * - ≤80: warning (degraded and unhealthy both map to "warning" for UI consistency)
 */
function getHealthStatusFromScore(score: number): string {
  if (score > 80) return "healthy";
  return "warning";
}

// ─── Source Health Explanation ──────────────────────────────────────────────

export type SourceHealthExplanation = {
  /** Source ID */
  sourceId: string;
  /** Source name */
  sourceName: string;
  /** Current health status */
  status: "healthy" | "warning" | "paused";
  /** Health score (0-100) */
  healthScore: number;
  /** Primary issue explanation */
  issue: string | null;
  /** Why this issue matters */
  impact: string | null;
  /** Impact level on theme judgment */
  impactLevel: "none" | "low" | "medium" | "high";
  /** What the user should do */
  recommendation: string | null;
  /** Detailed breakdown of issues */
  issues: Array<{
    type: "fetch_failed" | "long_stale" | "paused" | "pending_backlog" | "error_message";
    label: string;
    description: string;
    impact: string;
  }>;
};

/**
 * Generate a unified health explanation for a source.
 * Explains why a source is abnormal and what the impact is on theme judgment.
 */
export function explainSourceHealth(source: {
  id: string;
  name: string;
  status: string;
  isPaused?: boolean;
  latestRunStatus?: string | null;
  latestRunAt?: string | null;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  lastErrorMessage?: string | null;
  runCount24h?: number;
  failureCount24h?: number;
}): SourceHealthExplanation {
  const issues: SourceHealthExplanation["issues"] = [];
  const now = Date.now();

  // Check for paused status
  if (source.isPaused) {
    issues.push({
      type: "paused",
      label: "来源已暂停",
      description: "该来源当前处于暂停状态，不会自动执行抓取任务。",
      impact: "无法获取该来源的最新数据，主题判断可能缺少该渠道的信息。",
    });
  }

  // Check for recent fetch failures
  if (source.latestRunStatus === "failed") {
    issues.push({
      type: "fetch_failed",
      label: "最近抓取失败",
      description: source.lastErrorMessage || "最近一次抓取任务执行失败。",
      impact: "最新数据可能缺失或不完整，需要检查失败原因并重新抓取。",
    });
  }

  // Check for stale data (no success in 24 hours)
  if (source.latestSuccessAt) {
    const lastSuccess = new Date(source.latestSuccessAt).getTime();
    const hoursSinceSuccess = (now - lastSuccess) / (1000 * 60 * 60);

    if (hoursSinceSuccess > 24) {
      issues.push({
        type: "long_stale",
        label: "长时间未更新",
        description: `最近一次成功抓取在 ${Math.floor(hoursSinceSuccess)} 小时前。`,
        impact: "数据可能已经过时，无法反映最新情况。",
      });
    }
  } else if (!source.isPaused) {
    issues.push({
      type: "long_stale",
      label: "从未成功抓取",
      description: "该来源还没有成功抓取记录。",
      impact: "无法判断该来源的数据质量，需要先完成一次成功抓取。",
    });
  }

  // Check for pending backlog
  if (source.latestRunStatus === "pending") {
    issues.push({
      type: "pending_backlog",
      label: "任务排队中",
      description: "抓取任务正在排队等待执行。",
      impact: "数据更新会有延迟，但通常不会影响最终结果。",
    });
  }

  // Check for error message
  if (source.lastErrorMessage && source.latestRunStatus !== "failed") {
    issues.push({
      type: "error_message",
      label: "存在错误信息",
      description: source.lastErrorMessage,
      impact: "可能存在间歇性问题，需要关注是否会影响数据质量。",
    });
  }

  // Determine primary issue
  const primaryIssue = issues[0] ?? null;

  // Determine impact level
  let impactLevel: SourceHealthExplanation["impactLevel"] = "none";
  if (source.isPaused) {
    impactLevel = "low"; // Paused is intentional, low impact
  } else if (source.status === "warning" || source.latestRunStatus === "failed") {
    impactLevel = "high";
  } else if (issues.length > 0) {
    impactLevel = "medium";
  }

  // Generate recommendation
  let recommendation: string | null = null;
  if (source.isPaused) {
    recommendation = "如需继续监控，可以恢复该来源。";
  } else if (source.latestRunStatus === "failed") {
    recommendation = "检查错误信息并重新运行抓取任务。";
  } else if (issues.some((i) => i.type === "long_stale")) {
    recommendation = "手动触发一次抓取，确认来源是否仍然可用。";
  } else if (source.latestRunStatus === "pending") {
    recommendation = "等待当前任务完成，或检查是否有任务积压。";
  }

  // Calculate health score
  const healthScore = calculateSourceHealthScore({
    status: source.status,
    isPaused: source.isPaused,
    latestRunStatus: source.latestRunStatus,
    latestSuccessAt: source.latestSuccessAt,
    latestFailureAt: source.latestFailureAt,
    lastErrorMessage: source.lastErrorMessage,
  });

  // Determine status
  const status = source.isPaused ? "paused" : getHealthStatusFromScore(healthScore) as "healthy" | "warning";

  return {
    sourceId: source.id,
    sourceName: source.name,
    status,
    healthScore,
    issue: primaryIssue?.label ?? null,
    impact: primaryIssue?.impact ?? null,
    impactLevel,
    recommendation,
    issues,
  };
}

/**
 * Generate health explanations for multiple sources.
 */
export function explainMultipleSourceHealth(sources: Array<{
  id: string;
  name: string;
  status: string;
  isPaused?: boolean;
  latestRunStatus?: string | null;
  latestRunAt?: string | null;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  lastErrorMessage?: string | null;
  runCount24h?: number;
  failureCount24h?: number;
}>): SourceHealthExplanation[] {
  return sources.map((source) => explainSourceHealth(source));
}

export async function getSourceHealthStats(): Promise<SourceHealthStats> {
  const db = getDatabase();

  if (!db) {
    // Mock mode - calculate health based on actual source metrics
    const totalSources = mockSources.length;

    // Calculate health scores for each source
    const sourceHealthScores = mockSources.map((s) => ({
      source: s,
      healthScore: calculateSourceHealthScore(s),
    }));

    // Count sources by calculated status
    // Note: healthy and warning exclude paused sources to avoid double-counting
    const healthySources = sourceHealthScores.filter(
      (item) => !item.source.isPaused && item.healthScore > 80
    ).length;
    const warningSources = sourceHealthScores.filter(
      (item) => !item.source.isPaused && item.healthScore <= 80
    ).length;
    const pausedSources = mockSources.filter((s) => s.isPaused).length;

    // Calculate overall health rate based on health scores
    const activeSources = sourceHealthScores.filter((item) => !item.source.isPaused);
    const averageHealthScore = activeSources.length > 0
      ? activeSources.reduce((sum, item) => sum + item.healthScore, 0) / activeSources.length
      : 0;
    const healthRate = averageHealthScore / 100;

    // Calculate run statistics based on source data
    const sourcesWithFailures = mockSources.filter((s) => s.latestRunStatus === "failed");
    const totalRuns = mockSources.length * 3; // Assume 3 runs per source in 24h
    const failedRuns = sourcesWithFailures.length * 2; // Failed sources have ~2 failures
    const successfulRuns = totalRuns - failedRuns;

    // Collect recent errors from sources with failures
    const recentErrors = mockSources
      .filter((s) => s.lastErrorMessage && s.latestFailureAt)
      .map((s) => ({
        sourceId: s.id,
        sourceName: s.name,
        errorMessage: s.lastErrorMessage!,
        occurredAt: s.latestFailureAt!,
      }));

    return {
      totalSources,
      healthySources,
      warningSources,
      pausedSources,
      healthRate,
      recentRuns: {
        total: totalRuns,
        successful: successfulRuns,
        failed: failedRuns,
        successRate: totalRuns > 0 ? successfulRuns / totalRuns : 0,
      },
      averageRunDuration: 1500,
      recentErrors,
      sourceDetails: mockSources.map((s) => {
        const healthScore = calculateSourceHealthScore(s);
        const calculatedStatus = s.isPaused ? "paused" : getHealthStatusFromScore(healthScore);

        return {
          id: s.id,
          name: s.name,
          themeName: s.themeName,
          status: calculatedStatus,
          isPaused: s.isPaused ?? false,
          latestRunStatus: s.latestRunStatus ?? null,
          latestRunAt: s.latestRunAt ?? null,
          latestSuccessAt: s.latestSuccessAt,
          latestFailureAt: s.latestFailureAt,
          lastErrorMessage: s.lastErrorMessage ?? null,
          runCount24h: 3,
          successCount24h: s.latestRunStatus === "failed" ? 1 : 3,
          failureCount24h: s.latestRunStatus === "failed" ? 2 : 0,
        };
      }),
    };
  }

  // Get source counts by status
  const sources = await db
    .selectFrom("sources")
    .select([
      "id",
      "name",
      "theme_id as themeId",
      "status",
      "is_paused as isPaused",
      "latest_success_at as latestSuccessAt",
      "latest_failure_at as latestFailureAt",
    ])
    .execute();

  // Get theme names
  const themeIds = [...new Set(sources.map((s) => s.themeId))];
  const themes = themeIds.length > 0
    ? await db
        .selectFrom("themes")
        .select(["id", "name"])
        .where("id", "in", themeIds)
        .execute()
    : [];

  const themeMap = new Map(themes.map((t) => [t.id, t.name]));

  // Get recent runs (last 24 hours), sorted by creation time descending
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentRuns = await db
    .selectFrom("source_runs")
    .select([
      "source_id as sourceId",
      "status",
      "started_at as startedAt",
      "finished_at as finishedAt",
      "error_message as errorMessage",
    ])
    .where("created_at", ">=", twentyFourHoursAgo as any)
    .orderBy("created_at", "desc")
    .execute();

  // Calculate stats per source (runs are already sorted newest first)
  const sourceRunMap = new Map<string, typeof recentRuns>();
  for (const run of recentRuns) {
    const runs = sourceRunMap.get(run.sourceId) || [];
    runs.push(run);
    sourceRunMap.set(run.sourceId, runs);
  }

  const totalSources = sources.length;
  const healthySources = sources.filter((s) => s.status === "healthy" && !s.isPaused).length;
  const warningSources = sources.filter((s) => s.status === "warning").length;
  const pausedSources = sources.filter((s) => s.isPaused).length;

  const totalRuns = recentRuns.length;
  const successfulRuns = recentRuns.filter((r) => r.status === "completed").length;
  const failedRuns = recentRuns.filter((r) => r.status === "failed").length;

  // Calculate average run duration
  const runsWithDuration = recentRuns.filter((r) => r.startedAt && r.finishedAt);
  const totalDuration = runsWithDuration.reduce((sum, r) => {
    const start = new Date(r.startedAt!).getTime();
    const end = new Date(r.finishedAt!).getTime();
    return sum + (end - start);
  }, 0);
  const averageRunDuration = runsWithDuration.length > 0
    ? totalDuration / runsWithDuration.length
    : null;

  // Get recent errors (already sorted by created_at desc from recentRuns)
  const recentErrors = recentRuns
    .filter((r) => r.status === "failed" && r.errorMessage)
    .slice(0, 10)
    .map((r) => {
      const source = sources.find((s) => s.id === r.sourceId);
      return {
        sourceId: r.sourceId,
        sourceName: source?.name || "Unknown",
        errorMessage: r.errorMessage!,
        occurredAt: r.finishedAt?.toString() || new Date().toISOString(),
      };
    });

  // Build source details
  const sourceDetails = sources.map((s) => {
    const runs = sourceRunMap.get(s.id) || [];
    return {
      id: s.id,
      name: s.name,
      themeName: themeMap.get(s.themeId) || "Unknown",
      status: s.status,
      isPaused: s.isPaused,
      latestRunStatus: runs[0]?.status || null,
      latestRunAt: runs[0]?.finishedAt?.toString() || null,
      latestSuccessAt: s.latestSuccessAt?.toString() || null,
      latestFailureAt: s.latestFailureAt?.toString() || null,
      lastErrorMessage: runs.find((r) => r.status === "failed")?.errorMessage || null,
      runCount24h: runs.length,
      successCount24h: runs.filter((r) => r.status === "completed").length,
      failureCount24h: runs.filter((r) => r.status === "failed").length,
    };
  });

  return {
    totalSources,
    healthySources,
    warningSources,
    pausedSources,
    healthRate: totalSources > 0 ? healthySources / totalSources : 0,
    recentRuns: {
      total: totalRuns,
      successful: successfulRuns,
      failed: failedRuns,
      successRate: totalRuns > 0 ? successfulRuns / totalRuns : 0,
    },
    averageRunDuration,
    recentErrors,
    sourceDetails,
  };
}

// ─── Operational Metrics ─────────────────────────────────────────────────────

export async function getOperationalMetrics(): Promise<OperationalMetrics> {
  const db = getDatabase();

  if (!db) {
    // Mock mode - return simulated metrics
    const now = new Date();
    const runDurationTrend: DailyMetric[] = [];
    const failureRateTrend: DailyMetric[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      runDurationTrend.push({
        date: dateStr,
        value: 1200 + Math.random() * 600, // 1.2-1.8s
      });

      failureRateTrend.push({
        date: dateStr,
        value: 0.05 + Math.random() * 0.15, // 5-20%
      });
    }

    return {
      runDurationTrend,
      failureRateTrend,
      backlog: {
        pendingRuns: 3,
        runningRuns: 1,
        oldestPendingAge: "PT15M", // 15 minutes
      },
      recentExceptions: [
        {
          errorMessage: "Connection timeout to upstream source",
          count: 5,
          lastOccurredAt: new Date(now.getTime() - 3600_000).toISOString(),
          sourceIds: ["source-pbc-open-market", "source-stats-cpi-release"],
        },
        {
          errorMessage: "Parsing failed on latest page fetch",
          count: 2,
          lastOccurredAt: new Date(now.getTime() - 7200_000).toISOString(),
          sourceIds: ["source-pbc-open-market"],
        },
      ],
      hourlyDistribution: Array.from({ length: 24 }, (_, hour) => {
        const successful = Math.floor(Math.random() * 8);
        const failed = Math.floor(Math.random() * 2);
        return { hour, total: successful + failed, successful, failed };
      }),
    };
  }

  // ─── DB Mode ───────────────────────────────────────────────────────────────

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get all runs from last 7 days
  const runs = await db
    .selectFrom("source_runs")
    .select([
      "status",
      "started_at as startedAt",
      "finished_at as finishedAt",
      "error_message as errorMessage",
      "source_id as sourceId",
      "created_at as createdAt",
    ])
    .where("created_at", ">=", sevenDaysAgo as any)
    .execute();

  // ── Run Duration Trend (avg per day) ──────────────────────────────────────

  const dailyRuns = new Map<string, typeof runs>();
  for (const run of runs) {
    const dateKey = run.createdAt
      ? new Date(run.createdAt as any).toISOString().split("T")[0]
      : "unknown";
    const dayRuns = dailyRuns.get(dateKey) || [];
    dayRuns.push(run);
    dailyRuns.set(dateKey, dayRuns);
  }

  const runDurationTrend: DailyMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayRuns = dailyRuns.get(dateStr) || [];

    const runsWithDuration = dayRuns.filter((r) => r.startedAt && r.finishedAt);
    const avgDuration =
      runsWithDuration.length > 0
        ? runsWithDuration.reduce((sum, r) => {
            const start = new Date(r.startedAt as any).getTime();
            const end = new Date(r.finishedAt as any).getTime();
            return sum + (end - start);
          }, 0) / runsWithDuration.length
        : 0;

    runDurationTrend.push({ date: dateStr, value: Math.round(avgDuration) });
  }

  // ── Failure Rate Trend (per day) ──────────────────────────────────────────

  const failureRateTrend: DailyMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayRuns = dailyRuns.get(dateStr) || [];

    const total = dayRuns.length;
    const failed = dayRuns.filter((r) => r.status === "failed").length;
    failureRateTrend.push({
      date: dateStr,
      value: total > 0 ? Number((failed / total).toFixed(3)) : 0,
    });
  }

  // ── Task Backlog ──────────────────────────────────────────────────────────

  const pendingRuns = await db
    .selectFrom("source_runs")
    .select((eb) => eb.fn.count("id").as("count"))
    .where("status", "=", "pending")
    .executeTakeFirst();

  const runningRuns = await db
    .selectFrom("source_runs")
    .select((eb) => eb.fn.count("id").as("count"))
    .where("status", "=", "running")
    .executeTakeFirst();

  const oldestPending = await db
    .selectFrom("source_runs")
    .select("created_at as createdAt")
    .where("status", "=", "pending")
    .orderBy("created_at", "asc")
    .executeTakeFirst();

  const oldestPendingAge = oldestPending?.createdAt
    ? formatDuration(now.getTime() - new Date(oldestPending.createdAt as any).getTime())
    : null;

  // ── Recent Exception Aggregation ──────────────────────────────────────────

  const recentErrors = runs.filter((r) => r.status === "failed" && r.errorMessage);

  const errorMap = new Map<
    string,
    { count: number; lastOccurredAt: string; sourceIds: Set<string> }
  >();

  for (const run of recentErrors) {
    const msg = run.errorMessage!;
    const existing = errorMap.get(msg) || {
      count: 0,
      lastOccurredAt: "",
      sourceIds: new Set<string>(),
    };
    existing.count++;
    const runTime = run.finishedAt
      ? new Date(run.finishedAt as any).toISOString()
      : new Date(run.createdAt as any).toISOString();
    if (runTime > existing.lastOccurredAt) {
      existing.lastOccurredAt = runTime;
    }
    existing.sourceIds.add(run.sourceId);
    errorMap.set(msg, existing);
  }

  const recentExceptions = [...errorMap.entries()]
    .map(([errorMessage, data]) => ({
      errorMessage,
      count: data.count,
      lastOccurredAt: data.lastOccurredAt,
      sourceIds: [...data.sourceIds],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── Hourly Distribution (last 24h) ────────────────────────────────────────

  const hourlyRuns = runs.filter((r) => {
    const createdAt = r.createdAt ? new Date(r.createdAt as any) : null;
    return createdAt && createdAt >= twentyFourHoursAgo;
  });

  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
    const hourRuns = hourlyRuns.filter((r) => {
      const h = new Date(r.createdAt as any).getUTCHours();
      return h === hour;
    });
    return {
      hour,
      total: hourRuns.length,
      successful: hourRuns.filter((r) => r.status === "completed").length,
      failed: hourRuns.filter((r) => r.status === "failed").length,
    };
  });

  return {
    runDurationTrend,
    failureRateTrend,
    backlog: {
      pendingRuns: Number(pendingRuns?.count ?? 0),
      runningRuns: Number(runningRuns?.count ?? 0),
      oldestPendingAge,
    },
    recentExceptions,
    hourlyDistribution,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `PT${seconds}S`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `PT${minutes}M`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `PT${hours}H${remainingMinutes}M` : `PT${hours}H`;
}
