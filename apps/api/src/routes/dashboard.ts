import type { FastifyInstance } from "fastify";

import { getDashboardData } from "../services/dashboard-service.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async () => getDashboardData());
}
