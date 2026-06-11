import type { FastifyInstance } from "fastify";

import {
  createNotificationPreference,
  deleteNotificationPreference,
  getNotificationPreference,
  listNotificationPreferences,
  updateNotificationPreference,
} from "../services/notification-preference-service.js";

export async function registerNotificationPreferenceRoutes(app: FastifyInstance) {
  app.get("/api/notification-preferences", async () => {
    return listNotificationPreferences();
  });

  app.get<{ Params: { preferenceId: string } }>(
    "/api/notification-preferences/:preferenceId",
    async (request, reply) => {
      const preference = await getNotificationPreference(request.params.preferenceId);

      if (!preference) {
        reply.code(404);
        return { message: "Preference not found" };
      }

      return preference;
    },
  );

  app.post("/api/notification-preferences", async (request, reply) => {
    const body = request.body as {
      themeId?: string;
      sourceId?: string;
      signal?: string;
      channel?: string;
      isEnabled?: boolean;
      isMuted?: boolean;
      priorityOnly?: boolean;
    };

    if (!body) {
      reply.code(400);
      return { message: "Request body is required" };
    }

    return createNotificationPreference(body);
  });

  app.patch<{ Params: { preferenceId: string } }>(
    "/api/notification-preferences/:preferenceId",
    async (request, reply) => {
      const body = request.body as {
        themeId?: string;
        sourceId?: string;
        signal?: string;
        channel?: string;
        isEnabled?: boolean;
        isMuted?: boolean;
        priorityOnly?: boolean;
      };

      if (!body) {
        reply.code(400);
        return { message: "Request body is required" };
      }

      const updated = await updateNotificationPreference(
        request.params.preferenceId,
        body,
      );

      if (!updated) {
        reply.code(404);
        return { message: "Preference not found" };
      }

      return updated;
    },
  );

  app.delete<{ Params: { preferenceId: string } }>(
    "/api/notification-preferences/:preferenceId",
    async (request, reply) => {
      const deleted = await deleteNotificationPreference(request.params.preferenceId);

      if (!deleted) {
        reply.code(404);
        return { message: "Preference not found" };
      }

      return { success: true };
    },
  );
}
