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

export async function getSourceHealthStats(): Promise<SourceHealthStats> {
  const db = getDatabase();

  if (!db) {
    // Mock mode
    const totalSources = mockSources.length;
    const healthySources = mockSources.filter((s) => s.status === "healthy").length;
    const warningSources = mockSources.filter((s) => s.status === "warning").length;
    const pausedSources = mockSources.filter((s) => s.isPaused).length;

    return {
      totalSources,
      healthySources,
      warningSources,
      pausedSources,
      healthRate: totalSources > 0 ? healthySources / totalSources : 0,
      recentRuns: {
        total: 10,
        successful: 8,
        failed: 2,
        successRate: 0.8,
      },
      averageRunDuration: 1500,
      recentErrors: [
        {
          sourceId: "source-pbc-policy",
          sourceName: "PBOC Policy Page",
          errorMessage: "Parsing failed on latest page fetch.",
          occurredAt: "2026-06-01T06:00:00Z",
        },
      ],
      sourceDetails: mockSources.map((s) => ({
        id: s.id,
        name: s.name,
        themeName: s.themeName,
        status: s.status,
        isPaused: s.isPaused ?? false,
        latestRunStatus: s.latestRunStatus ?? null,
        latestRunAt: s.latestRunAt ?? null,
        latestSuccessAt: s.latestSuccessAt,
        latestFailureAt: s.latestFailureAt,
        lastErrorMessage: s.lastErrorMessage ?? null,
        runCount24h: 3,
        successCount24h: s.status === "healthy" ? 3 : 1,
        failureCount24h: s.status === "warning" ? 2 : 0,
      })),
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
          sourceIds: ["source-pbc-policy", "source-eastmoney-sh"],
        },
        {
          errorMessage: "Parsing failed on latest page fetch",
          count: 2,
          lastOccurredAt: new Date(now.getTime() - 7200_000).toISOString(),
          sourceIds: ["source-pbc-policy"],
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
