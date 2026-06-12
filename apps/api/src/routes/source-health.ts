/**
 * Source health monitoring routes.
 */

import type { FastifyInstance } from "fastify";

import { getSourceHealthStats, getOperationalMetrics } from "../services/source-health-service.js";

export async function registerSourceHealthRoutes(app: FastifyInstance) {
  app.get("/api/sources/health", async () => {
    return getSourceHealthStats();
  });

  app.get("/api/sources/operational-metrics", async () => {
    return getOperationalMetrics();
  });
}
