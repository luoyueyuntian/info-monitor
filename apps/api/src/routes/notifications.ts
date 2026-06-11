import type { FastifyInstance } from "fastify";

import {
  batchDeleteNotifications,
  batchMarkNotificationsRead,
  clearUnreadByTheme,
  getNotificationDetail,
  isNotificationStatus,
  listNotifications,
  markNotificationStatus,
} from "../services/notification-service.js";
import type { NotificationStatus } from "../services/notification-service.js";

export async function registerNotificationRoutes(app: FastifyInstance) {
  app.get("/api/notifications", async (request, reply) => {
    const query = request.query as {
      status?: string;
      limit?: string;
      cursor?: string;
      offset?: string;
    };
    let status: NotificationStatus | undefined;
    let limit: number | undefined;
    let offset: number | undefined;

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

    if (query.offset !== undefined) {
      offset = Number.parseInt(query.offset, 10);

      if (!Number.isInteger(offset) || offset < 0) {
        reply.code(400);
        return { message: "offset must be a non-negative integer" };
      }
    }

    return listNotifications({
      limit,
      status,
      cursor: query.cursor,
      offset,
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

  // Batch operations
  app.post("/api/notifications/batch/read", async (request, reply) => {
    const body = request.body as { ids?: string[] };

    if (!Array.isArray(body?.ids) || body.ids.length === 0) {
      reply.code(400);
      return { message: "ids array is required and must not be empty" };
    }

    return batchMarkNotificationsRead(body.ids);
  });

  app.post("/api/notifications/batch/delete", async (request, reply) => {
    const body = request.body as {
      status?: string;
      channel?: string;
      signal?: string;
      themeId?: string;
    };

    const filter: {
      status?: NotificationStatus;
      channel?: string;
      signal?: string;
      themeId?: string;
    } = {};

    if (body.status !== undefined) {
      if (!isNotificationStatus(body.status)) {
        reply.code(400);
        return { message: "Invalid notification status" };
      }
      filter.status = body.status;
    }

    if (body.channel) {
      filter.channel = body.channel;
    }

    return batchDeleteNotifications(filter);
  });

  app.post("/api/notifications/batch/clear-unread/:themeId", async (request, reply) => {
    const { themeId } = request.params as { themeId: string };

    if (!themeId) {
      reply.code(400);
      return { message: "themeId is required" };
    }

    return clearUnreadByTheme(themeId);
  });
}
