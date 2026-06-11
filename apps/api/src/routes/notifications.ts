import type { FastifyInstance } from "fastify";

import {
  getNotificationDetail,
  isNotificationStatus,
  listNotifications,
  markNotificationStatus,
} from "../services/notification-service.js";
import type { NotificationStatus } from "../services/notification-service.js";

export async function registerNotificationRoutes(app: FastifyInstance) {
  app.get("/api/notifications", async (request, reply) => {
    const query = request.query as { status?: string; limit?: string };
    let status: NotificationStatus | undefined;
    let limit: number | undefined;

    if (query.status !== undefined) {
      if (!isNotificationStatus(query.status)) {
        reply.code(400);
        return { message: "Invalid notification status" };
      }

      status = query.status;
    }

    if (query.limit !== undefined) {
      limit = Number.parseInt(query.limit, 10);

      if (!Number.isInteger(limit) || limit <= 0) {
        reply.code(400);
        return { message: "limit must be a positive integer" };
      }
    }

    return listNotifications({
      limit,
      status,
    });
  });

  app.get<{ Params: { notificationId: string } }>(
    "/api/notifications/:notificationId",
    async (request, reply) => {
      const notification = await getNotificationDetail(request.params.notificationId);

      if (!notification) {
        reply.code(404);
        return { message: "Notification not found" };
      }

      return notification;
    },
  );

  app.patch<{ Params: { notificationId: string } }>(
    "/api/notifications/:notificationId",
    async (request, reply) => {
      const body = request.body as { status?: string };

      if (typeof body?.status !== "string") {
        reply.code(400);
        return { message: "status field is required" };
      }

      if (!isNotificationStatus(body.status)) {
        reply.code(400);
        return { message: "Invalid notification status" };
      }

      const updated = await markNotificationStatus(
        request.params.notificationId,
        body.status,
      );

      if (!updated) {
        reply.code(404);
        return { message: "Notification not found" };
      }

      return updated;
    },
  );
}
