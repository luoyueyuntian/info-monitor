import { afterAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe("notification integration", () => {
  describe("notification listing with pagination", () => {
    it("returns paginated notifications", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notifications",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty("items");
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("hasMore");
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThanOrEqual(1);
    });

    it("respects limit parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notifications?limit=1",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.items).toHaveLength(1);
    });

    it("supports offset-based pagination", async () => {
      const firstPage = await app.inject({
        method: "GET",
        url: "/api/notifications?limit=1&offset=0",
      });
      const secondPage = await app.inject({
        method: "GET",
        url: "/api/notifications?limit=1&offset=1",
      });

      expect(firstPage.statusCode).toBe(200);
      expect(secondPage.statusCode).toBe(200);

      const first = firstPage.json();
      const second = secondPage.json();

      expect(first.items).toHaveLength(1);
      expect(second.items).toHaveLength(1);
      expect(first.items[0].id).not.toBe(second.items[0].id);
    });

    it("filters by status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notifications?status=pending",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      for (const item of body.items) {
        expect(item.status).toBe("pending");
      }
    });

    it("filters by level (high priority)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notifications?level=high",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // All returned items should have a signal that maps to high priority
      const highSignals = ["30d_low", "bullish", "bearish", "liquidity_injection", "liquidity_withdrawal"];
      for (const item of body.items) {
        // Item either has a high-priority signal or no signal (should be excluded now)
        if (item.signal) {
          expect(highSignals).toContain(item.signal);
        }
      }
    });

    it("filters by level (medium priority)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notifications?level=medium",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const mediumSignals = ["new_announcement", "new_financial_event"];
      for (const item of body.items) {
        if (item.signal) {
          expect(mediumSignals).toContain(item.signal);
        }
      }
    });

    it("level filter excludes event-less notifications", async () => {
      // First get all notifications to find one with eventId
      const allResponse = await app.inject({
        method: "GET",
        url: "/api/notifications",
      });
      const allItems = allResponse.json().items;

      // Get high-priority filtered notifications
      const highResponse = await app.inject({
        method: "GET",
        url: "/api/notifications?level=high",
      });
      const highItems = highResponse.json().items;

      // If there are event-less notifications in all items, they should not be in high items
      const eventLessInAll = allItems.filter((n: any) => !n.eventId);
      if (eventLessInAll.length > 0) {
        const highIds = new Set(highItems.map((n: any) => n.id));
        for (const eventLess of eventLessInAll) {
          expect(highIds.has(eventLess.id)).toBe(false);
        }
      }
    });
  });

  describe("notification detail", () => {
    it("returns notification when found", async () => {
      const listResponse = await app.inject({
        method: "GET",
        url: "/api/notifications?limit=1",
      });
      const firstNotification = listResponse.json().items[0];

      const response = await app.inject({
        method: "GET",
        url: `/api/notifications/${firstNotification.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(firstNotification.id);
      expect(body).toHaveProperty("title");
      expect(body).toHaveProperty("summary");
      expect(body).toHaveProperty("signal");
    });

    it("returns 404 for nonexistent notification", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notifications/nonexistent-id",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("notification status update", () => {
    it("updates notification status", async () => {
      const listResponse = await app.inject({
        method: "GET",
        url: "/api/notifications?status=pending&limit=1",
      });
      const pending = listResponse.json().items[0];

      if (!pending) {
        // Skip if no pending notifications
        return;
      }

      const updateResponse = await app.inject({
        method: "PATCH",
        url: `/api/notifications/${pending.id}`,
        payload: { status: "sent" },
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = updateResponse.json();
      expect(body.id).toBe(pending.id);
      expect(body.status).toBe("sent");

      // Reset for other tests
      await app.inject({
        method: "PATCH",
        url: `/api/notifications/${pending.id}`,
        payload: { status: "pending" },
      });
    });

    it("rejects invalid status", async () => {
      const listResponse = await app.inject({
        method: "GET",
        url: "/api/notifications?limit=1",
      });
      const notification = listResponse.json().items[0];

      const response = await app.inject({
        method: "PATCH",
        url: `/api/notifications/${notification.id}`,
        payload: { status: "invalid" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("batch operations", () => {
    it("batch marks notifications as read", async () => {
      const listResponse = await app.inject({
        method: "GET",
        url: "/api/notifications?status=pending&limit=2",
      });
      const pendingItems = listResponse.json().items;

      if (pendingItems.length === 0) {
        return;
      }

      const response = await app.inject({
        method: "POST",
        url: "/api/notifications/batch/read",
        payload: { ids: pendingItems.map((n: any) => n.id) },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty("updated");
      expect(body.updated).toBeGreaterThanOrEqual(0);

      // Reset for other tests
      for (const item of pendingItems) {
        await app.inject({
          method: "PATCH",
          url: `/api/notifications/${item.id}`,
          payload: { status: "pending" },
        });
      }
    });

    it("batch deletes notifications by filter", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/notifications/batch/delete",
        payload: { status: "failed" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty("deleted");
      expect(body.deleted).toBeGreaterThanOrEqual(0);
    });

    it("clears unread by theme", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/notifications/batch/clear-unread/theme-surface-pro-8",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty("updated");
      expect(body.updated).toBeGreaterThanOrEqual(0);
    });
  });

  describe("notification preferences", () => {
    it("lists preferences", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notification-preferences",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it("creates a new preference", async () => {
      const response = await app.inject({
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

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty("id");
      expect(body.channel).toBe("email");
      expect(body.signal).toBe("30d_low");

      // Cleanup
      await app.inject({
        method: "DELETE",
        url: `/api/notification-preferences/${body.id}`,
      });
    });

    it("updates a preference", async () => {
      // Create a preference first
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/notification-preferences",
        payload: {
          channel: "webhook",
          isEnabled: true,
        },
      });
      const created = createResponse.json();

      const updateResponse = await app.inject({
        method: "PATCH",
        url: `/api/notification-preferences/${created.id}`,
        payload: { isMuted: true },
      });

      expect(updateResponse.statusCode).toBe(200);
      const body = updateResponse.json();
      expect(body.isMuted).toBe(true);

      // Cleanup
      await app.inject({
        method: "DELETE",
        url: `/api/notification-preferences/${created.id}`,
      });
    });

    it("deletes a preference", async () => {
      // Create a preference first
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/notification-preferences",
        payload: { channel: "telegram" },
      });
      const created = createResponse.json();

      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/api/notification-preferences/${created.id}`,
      });

      expect(deleteResponse.statusCode).toBe(200);
      const body = deleteResponse.json();
      expect(body.success).toBe(true);

      // Verify it's gone
      const getResponse = await app.inject({
        method: "GET",
        url: `/api/notification-preferences/${created.id}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe("API contract validation", () => {
    it("notification items have required fields", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notifications?limit=1",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const item = body.items[0];

      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("eventId");
      expect(item).toHaveProperty("channel");
      expect(item).toHaveProperty("status");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("summary");
      expect(item).toHaveProperty("signal");
      expect(item).toHaveProperty("sentAt");
      expect(item).toHaveProperty("createdAt");

      expect(typeof item.id).toBe("string");
      expect(typeof item.eventId).toBe("string");
      expect(typeof item.channel).toBe("string");
      expect(typeof item.status).toBe("string");
      expect(typeof item.title).toBe("string");
      expect(typeof item.summary).toBe("string");
      expect(typeof item.signal).toBe("string");
    });

    it("pagination response has correct structure", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notifications",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      expect(body).toHaveProperty("items");
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("hasMore");

      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.total).toBe("number");
      expect(typeof body.hasMore).toBe("boolean");
    });

    it("preference items have required fields", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/notification-preferences",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();

      if (body.length > 0) {
        const item = body[0];
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("userId");
        expect(item).toHaveProperty("channel");
        expect(item).toHaveProperty("isEnabled");
        expect(item).toHaveProperty("isMuted");
        expect(item).toHaveProperty("priorityOnly");
        expect(item).toHaveProperty("createdAt");
        expect(item).toHaveProperty("updatedAt");
      }
    });
  });
});
