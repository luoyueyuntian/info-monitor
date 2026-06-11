import { describe, expect, it } from "vitest";

import {
  getNotificationDetail,
  listNotifications,
  markNotificationStatus,
} from "./notification-service.js";

describe("notification-service (mock mode)", () => {
  describe("listNotifications", () => {
    it("returns paginated notifications by default", async () => {
      const result = await listNotifications();

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("hasMore");
      expect(result.items.length).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.items[0]).toHaveProperty("id");
      expect(result.items[0]).toHaveProperty("eventId");
      expect(result.items[0]).toHaveProperty("channel");
      expect(result.items[0]).toHaveProperty("status");
      expect(result.items[0]).toHaveProperty("title");
      expect(result.items[0]).toHaveProperty("summary");
      expect(result.items[0]).toHaveProperty("signal");
      expect(result.items[0]).toHaveProperty("createdAt");
    });

    it("filters by status", async () => {
      const pending = await listNotifications({ status: "pending" });

      for (const notification of pending.items) {
        expect(notification.status).toBe("pending");
      }

      const sent = await listNotifications({ status: "sent" });

      for (const notification of sent.items) {
        expect(notification.status).toBe("sent");
      }
    });

    it("respects limit option", async () => {
      const result = await listNotifications({ limit: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });

    it("supports offset-based pagination", async () => {
      const firstPage = await listNotifications({ limit: 1, offset: 0 });
      const secondPage = await listNotifications({ limit: 1, offset: 1 });

      expect(firstPage.items).toHaveLength(1);
      expect(secondPage.items).toHaveLength(1);
      expect(firstPage.items[0].id).not.toBe(secondPage.items[0].id);
    });

    it("returns notifications sorted by createdAt descending", async () => {
      const result = await listNotifications();

      for (let i = 1; i < result.items.length; i++) {
        const prev = new Date(result.items[i - 1].createdAt).getTime();
        const curr = new Date(result.items[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe("getNotificationDetail", () => {
    it("returns notification when found", async () => {
      const result = await listNotifications();
      const first = result.items[0];
      const detail = await getNotificationDetail(first.id);

      expect(detail).not.toBeNull();
      expect(detail?.id).toBe(first.id);
      expect(detail?.title).toBe(first.title);
    });

    it("returns null when not found", async () => {
      const detail = await getNotificationDetail("nonexistent-id");

      expect(detail).toBeNull();
    });
  });

  describe("markNotificationStatus", () => {
    it("updates notification status", async () => {
      const result = await listNotifications({ status: "pending" });
      const pending = result.items[0];

      const updateResult = await markNotificationStatus(pending.id, "sent");

      expect(updateResult).not.toBeNull();
      expect(updateResult?.status).toBe("sent");

      // Reset for other tests
      await markNotificationStatus(pending.id, "pending");
    });

    it("updates sentAt alongside status changes in mock mode", async () => {
      const result = await listNotifications({ status: "pending" });
      const pending = result.items[0];

      await markNotificationStatus(pending.id, "sent");
      const sentDetail = await getNotificationDetail(pending.id);

      expect(sentDetail?.status).toBe("sent");
      expect(sentDetail?.sentAt).not.toBeNull();

      await markNotificationStatus(pending.id, "failed");
      const failedDetail = await getNotificationDetail(pending.id);

      expect(failedDetail?.status).toBe("failed");
      expect(failedDetail?.sentAt).toBeNull();

      // Reset for other tests
      await markNotificationStatus(pending.id, "pending");
    });

    it("returns null for nonexistent notification", async () => {
      const result = await markNotificationStatus("nonexistent-id", "sent");

      expect(result).toBeNull();
    });
  });
});
