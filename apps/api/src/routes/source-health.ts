/**
 * Source health monitoring routes.
 */

import type { FastifyInstance } from "fastify";

import {
  getSourceHealthStats,
  getOperationalMetrics,
  explainSourceHealth,
  explainMultipleSourceHealth,
} from "../services/source-health-service.js";

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

    return explainSourceHealth(source);
  });

  // Get health explanations for all sources
  app.get("/api/sources/health-explanations", async () => {
    const stats = await getSourceHealthStats();
    return explainMultipleSourceHealth(stats.sourceDetails);
  });
}
