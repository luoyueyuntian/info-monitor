import { describe, expect, it } from "vitest";

import {
  getNotificationDetail,
  listNotifications,
  markNotificationStatus,
} from "./notification-service.js";

describe("notification-service (mock mode)", () => {
  describe("listNotifications", () => {
    it("returns all notifications by default", async () => {
      const notifications = await listNotifications();

      expect(notifications.length).toBeGreaterThanOrEqual(3);
      expect(notifications[0]).toHaveProperty("id");
      expect(notifications[0]).toHaveProperty("eventId");
      expect(notifications[0]).toHaveProperty("channel");
      expect(notifications[0]).toHaveProperty("status");
      expect(notifications[0]).toHaveProperty("title");
      expect(notifications[0]).toHaveProperty("summary");
      expect(notifications[0]).toHaveProperty("signal");
      expect(notifications[0]).toHaveProperty("createdAt");
    });

    it("filters by status", async () => {
      const pending = await listNotifications({ status: "pending" });

      for (const notification of pending) {
        expect(notification.status).toBe("pending");
      }

      const sent = await listNotifications({ status: "sent" });

      for (const notification of sent) {
        expect(notification.status).toBe("sent");
      }
    });

    it("respects limit option", async () => {
      const notifications = await listNotifications({ limit: 1 });

      expect(notifications).toHaveLength(1);
    });

    it("returns notifications sorted by createdAt descending", async () => {
      const notifications = await listNotifications();

      for (let i = 1; i < notifications.length; i++) {
        const prev = new Date(notifications[i - 1].createdAt).getTime();
        const curr = new Date(notifications[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe("getNotificationDetail", () => {
    it("returns notification when found", async () => {
      const notifications = await listNotifications();
      const first = notifications[0];
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
      const notifications = await listNotifications({ status: "pending" });
      const pending = notifications[0];

      const result = await markNotificationStatus(pending.id, "sent");

      expect(result).not.toBeNull();
      expect(result?.status).toBe("sent");

      // Reset for other tests
      await markNotificationStatus(pending.id, "pending");
    });

    it("updates sentAt alongside status changes in mock mode", async () => {
      const notifications = await listNotifications({ status: "pending" });
      const pending = notifications[0];

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
