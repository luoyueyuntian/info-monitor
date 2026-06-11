/**
 * Source health monitoring routes.
 */

import type { FastifyInstance } from "fastify";

import { getSourceHealthStats } from "../services/source-health-service.js";

export async function registerSourceHealthRoutes(app: FastifyInstance) {
  app.get("/api/sources/health", async () => {
    return getSourceHealthStats();
  });
}
