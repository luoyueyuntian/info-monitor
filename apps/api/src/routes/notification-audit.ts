/**
 * Notification audit log routes.
 */

import type { FastifyInstance } from "fastify";

import {
  getAuditLogs,
  getNotificationTimeline,
  type AuditAction,
} from "../services/notification-audit-service.js";

const validActions: AuditAction[] = ["created", "sent", "failed", "read", "retried", "deleted"];

export async function registerNotificationAuditRoutes(app: FastifyInstance) {
  app.get("/api/notification-audit", async (request, reply) => {
    const query = request.query as {
      notificationId?: string;
      action?: string;
      limit?: string;
      offset?: string;
    };

    let action: AuditAction | undefined;

    if (query.action) {
      if (!validActions.includes(query.action as AuditAction)) {
        reply.code(400);
        return { message: "Invalid audit action" };
      }
      action = query.action as AuditAction;
    }

    const limit = query.limit ? Number.parseInt(query.limit, 10) : undefined;
    const offset = query.offset ? Number.parseInt(query.offset, 10) : undefined;

    if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
      reply.code(400);
      return { message: "limit must be a positive integer" };
    }

    if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
      reply.code(400);
      return { message: "offset must be a non-negative integer" };
    }

    return getAuditLogs({
      notificationId: query.notificationId,
      action,
      limit,
      offset,
    });
  });

  app.get<{ Params: { notificationId: string } }>(
    "/api/notification-audit/:notificationId/timeline",
    async (request, reply) => {
      const timeline = await getNotificationTimeline(request.params.notificationId);

      if (!timeline.length) {
        // Check if notification exists
        reply.code(404);
        return { message: "No audit logs found for this notification" };
      }

      return timeline;
    },
  );
}
