import type { FastifyInstance } from "fastify";

import { search } from "../services/search-service.js";

export async function registerSearchRoutes(app: FastifyInstance) {
  app.get("/api/search", async (request, reply) => {
    const { q, type, themeId } = request.query as {
      q?: string;
      type?: string;
      themeId?: string;
    };

    if (!q || q.trim().length === 0) {
      return reply.code(400).send({ error: "Query parameter 'q' is required" });
    }

    const validTypes = ["event", "notification", "theme", "record"];
    if (type && !validTypes.includes(type)) {
      return reply.code(400).send({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
    }

    const result = await search(q.trim(), type, themeId);
    return reply.send(result);
  });
}
