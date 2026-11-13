import type { FastifyInstance } from "fastify";
import { sql } from "kysely";

import { getDatabase } from "../db/client.js";

export async function registerHealthRoutes(app: FastifyInstance) {
  for (const path of ["/health", "/api/health"]) {
    app.get(path, async (_request, reply) => {
      try {
        await getDatabase().selectNoFrom(sql<number>`1`.as("ok")).executeTakeFirst();
        return { status: "ok", service: "api", database: "available", timestamp: new Date().toISOString() };
      } catch {
        return reply.code(503).send({
          status: "error", service: "api", database: "unavailable", timestamp: new Date().toISOString(),
        });
      }
    });
  }
}
