/**
 * Source health monitoring service.
 *
 * Provides health statistics and monitoring for data sources.
 */

import { getDatabase } from "../db/client.js";
import { mockSources } from "../lib/mock-store.js";

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
  const themes = await db
    .selectFrom("themes")
    .select(["id", "name"])
    .where("id", "in", themeIds)
    .execute();

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
