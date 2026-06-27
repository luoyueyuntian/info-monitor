import type { FastifyInstance } from "fastify";

import { runBacktest } from "../services/backtest-service.js";

export async function registerBacktestRoutes(app: FastifyInstance) {
  app.post("/api/sources/:sourceId/backtest", async (request, reply) => {
    const { sourceId } = request.params as { sourceId: string };
    const { startDate, endDate, detectorConfig } = request.body as {
      startDate?: string;
      endDate?: string;
      detectorConfig?: Record<string, unknown>;
    };

    if (!startDate || !endDate) {
      return reply.code(400).send({
        error: "startDate and endDate are required (ISO format)",
      });
    }

    try {
      const result = await runBacktest(sourceId, startDate, endDate, detectorConfig);
      return reply.send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backtest failed";
      return reply.code(400).send({ error: message });
    }
  });
}
