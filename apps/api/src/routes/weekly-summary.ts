import type { FastifyInstance } from "fastify";

import {
  getWeeklySummary,
  getWeeklySummaryCompare,
  getWeeklyReviewHistory,
  exportWeeklyReview,
} from "../services/weekly-summary-service.js";

export async function registerWeeklySummaryRoutes(app: FastifyInstance) {
  app.get("/api/weekly-summary", async () => getWeeklySummary());

  app.get("/api/weekly-summary/compare", async () => getWeeklySummaryCompare());

  // Task 11: Weekly review history browsing
  app.get<{ Querystring: { weeks?: string } }>(
    "/api/weekly-summary/history",
    async (request) => {
      const weeks = request.query.weeks ? parseInt(request.query.weeks, 10) : 4;
      return getWeeklyReviewHistory(Math.min(Math.max(weeks, 1), 12));
    },
  );

  // Task 11: Export weekly review
  app.get<{ Querystring: { format?: string } }>(
    "/api/weekly-summary/export",
    async (request) => {
      const format = request.query.format === "json" ? "json" : "text";
      const summary = await getWeeklySummary();
      const exported = exportWeeklyReview(summary, format);

      if (format === "json") {
        return JSON.parse(exported);
      }

      return { content: exported, format: "text" };
    },
  );
}
