import type { SSEMessage } from "@info-monitor/shared-contracts";
import type { FastifyInstance } from "fastify";

import { eventBus } from "../services/event-bus.js";

export async function registerEventStreamRoutes(app: FastifyInstance) {
  app.get("/api/events/stream", { config: { compress: false } }, async (request, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Send retry interval
    reply.raw.write("retry: 5000\n\n");

    // Send initial connection event
    const connectEvent: SSEMessage = {
      type: "new_event",
      payload: { message: "connected" },
      timestamp: new Date().toISOString(),
    };
    reply.raw.write(`data: ${JSON.stringify(connectEvent)}\n\n`);

    const onMessage = (message: SSEMessage) => {
      reply.raw.write(`data: ${JSON.stringify(message)}\n\n`);
    };

    eventBus.on("sse", onMessage);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      reply.raw.write(": heartbeat\n\n");
    }, 30000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      eventBus.off("sse", onMessage);
    });
  });
}
