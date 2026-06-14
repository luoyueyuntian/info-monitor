/**
 * Source health monitoring routes.
 */

import type { FastifyInstance } from "fastify";

import { getDatabase } from "../db/client.js";
import {
  getSourceHealthStats,
  getOperationalMetrics,
  explainSourceHealth,
  explainMultipleSourceHealth,
} from "../services/source-health-service.js";

/**
 * Fetch recent run metrics for drift detection.
 * Returns record counts and snapshot counts from recent runs.
 * Note: record_count and snapshot_count may not exist in all DB schemas;
 * this function gracefully returns empty metrics if the columns are missing.
 */
async function getRecentRunMetrics(sourceId: string): Promise<{
  recentRecordCounts: number[];
  latestRecordCount: number;
  latestSnapshotCount: number;
  latestEventCount: number;
}> {
  const db = getDatabase();

  if (!db) {
    // Mock mode: return empty metrics (drift detection requires real run data)
    return { recentRecordCounts: [], latestRecordCount: 0, latestSnapshotCount: 0, latestEventCount: 0 };
  }

  try {
    // Use raw query since record_count/snapshot_count may not be in Kysely schema
    const { sql } = await import("kysely");
    const runs = await db
      .selectFrom("source_runs")
      .select([
        "id",
        sql<number>`COALESCE((SELECT COUNT(*) FROM normalized_records WHERE source_run_id = source_runs.id), 0)`.as("record_count"),
        sql<number>`COALESCE((SELECT COUNT(*) FROM raw_snapshots WHERE source_run_id = source_runs.id), 0)`.as("snapshot_count"),
        sql<number>`COALESCE((SELECT COUNT(*) FROM events WHERE source_run_id = source_runs.id), 0)`.as("event_count"),
      ])
      .where("source_id", "=", sourceId)
      .where("trigger_type", "not in", ["test", "replay"])
      .orderBy("created_at", "desc")
      .limit(10)
      .execute();

    const recentRecordCounts = runs.map((r) => Number((r as any).record_count ?? 0));
    const latestRecordCount = runs[0] ? Number((runs[0] as any).record_count ?? 0) : 0;
    const latestSnapshotCount = runs[0] ? Number((runs[0] as any).snapshot_count ?? 0) : 0;
    const latestEventCount = runs[0] ? Number((runs[0] as any).event_count ?? 0) : 0;

    return { recentRecordCounts, latestRecordCount, latestSnapshotCount, latestEventCount };
  } catch {
    // If the queries fail (e.g., columns don't exist), return empty metrics
    return { recentRecordCounts: [], latestRecordCount: 0, latestSnapshotCount: 0, latestEventCount: 0 };
  }
}

export async function registerSourceHealthRoutes(app: FastifyInstance) {
  app.get("/api/sources/health", async () => {
    return getSourceHealthStats();
  });

  app.get("/api/sources/operational-metrics", async () => {
    return getOperationalMetrics();
  });

  // Get health explanation for a specific source
  app.get<{
    Params: { sourceId: string };
  }>("/api/sources/:sourceId/health-explanation", async (request, reply) => {
    const { sourceId } = request.params;
    const stats = await getSourceHealthStats();
    const source = stats.sourceDetails.find((s) => s.id === sourceId);

    if (!source) {
      reply.code(404);
      return { error: "Source not found" };
    }

    // Fetch run metrics for drift detection
    const runMetrics = await getRecentRunMetrics(sourceId);

    return explainSourceHealth({
      ...source,
      ...runMetrics,
    });
  });

  // Get health explanations for all sources
  app.get("/api/sources/health-explanations", async () => {
    const stats = await getSourceHealthStats();
    // For bulk explanations, pass empty drift metrics (drift detection is per-source)
    return explainMultipleSourceHealth(stats.sourceDetails);
  });
}
