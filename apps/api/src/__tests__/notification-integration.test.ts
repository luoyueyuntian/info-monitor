import { afterAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe("notification integration", () => {
  describe("notification runtime database requirement", () => {
    it("notification listing endpoints fail without DATABASE_URL", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notifications",
      });

      expect(response.statusCode).toBe(500);
      expect(response.body).toContain("DATABASE_URL");
    });

    it("notification detail and update endpoints fail without DATABASE_URL", async () => {
      const detail = await app.inject({
        method: "GET",
        url: "/api/notifications/notification-surface-low",
      });
      expect(detail.statusCode).toBe(500);
      expect(detail.body).toContain("DATABASE_URL");

      const update = await app.inject({
        method: "PATCH",
        url: "/api/notifications/notification-surface-low",
        payload: { status: "sent" },
      });
      expect(update.statusCode).toBe(500);
      expect(update.body).toContain("DATABASE_URL");
    });

    it("notification batch endpoints fail without DATABASE_URL", async () => {
      const batchRead = await app.inject({
        method: "POST",
        url: "/api/notifications/batch/read",
        payload: { ids: ["notification-surface-low"] },
      });
      expect(batchRead.statusCode).toBe(500);
      expect(batchRead.body).toContain("DATABASE_URL");

      const batchDelete = await app.inject({
        method: "POST",
        url: "/api/notifications/batch/delete",
        payload: { status: "failed" },
      });
      expect(batchDelete.statusCode).toBe(500);
      expect(batchDelete.body).toContain("DATABASE_URL");

      const clearUnread = await app.inject({
        method: "POST",
        url: "/api/notifications/batch/clear-unread/theme-surface-pro-8",
      });
      expect(clearUnread.statusCode).toBe(500);
      expect(clearUnread.body).toContain("DATABASE_URL");
    });
  });

  describe("notification preference runtime database requirement", () => {
    it("preference endpoints fail without DATABASE_URL", async () => {
      const listResponse = await app.inject({
        method: "GET",
        url: "/api/notification-preferences",
      });
      expect(listResponse.statusCode).toBe(500);
      expect(listResponse.body).toContain("DATABASE_URL");

      const createResponse = await app.inject({
        method: "POST",
        url: "/api/notification-preferences",
        payload: {
          channel: "email",
          signal: "30d_low",
          isEnabled: true,
          isMuted: false,
          priorityOnly: false,
        },
      });
      expect(createResponse.statusCode).toBe(500);
      expect(createResponse.body).toContain("DATABASE_URL");

      const updateResponse = await app.inject({
        method: "PATCH",
        url: "/api/notification-preferences/pref-default-theme-surface-pro-8-in_app",
        payload: { isMuted: true },
      });
      expect(updateResponse.statusCode).toBe(500);
      expect(updateResponse.body).toContain("DATABASE_URL");

      const deleteResponse = await app.inject({
        method: "DELETE",
        url: "/api/notification-preferences/pref-default-theme-surface-pro-8-in_app",
      });
      expect(deleteResponse.statusCode).toBe(500);
      expect(deleteResponse.body).toContain("DATABASE_URL");

      const getByIdResponse = await app.inject({
        method: "GET",
        url: "/api/notification-preferences/pref-default-theme-surface-pro-8-in_app",
      });
      expect(getByIdResponse.statusCode).toBe(500);
      expect(getByIdResponse.body).toContain("DATABASE_URL");
    });
  });
});
