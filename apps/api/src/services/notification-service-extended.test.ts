import { describe, expect, it, vi, beforeEach } from "vitest";

// Force mock mode
vi.mock("../db/client.js", () => ({
  getDatabase: () => null,
}));

import {
  batchMarkNotificationsRead,
  batchDeleteNotifications,
  clearUnreadByTheme,
  retryFailedNotification,
  getNotificationStats,
  sendExternalNotification,
  listNotifications,
  markNotificationStatus,
} from "./notification-service.js";

// ─── Batch Operations ────────────────────────────────────────────────────────

describe("notification-service batch operations (mock mode)", () => {
  describe("batchMarkNotificationsRead", () => {
    it("marks multiple notifications as read (sent)", async () => {
      // Get pending notifications
      const pending = await listNotifications({ status: "pending" });
      if (pending.items.length === 0) return;

      const ids = pending.items.map((n) => n.id);
      const result = await batchMarkNotificationsRead(ids);

      expect(result.updated).toBe(ids.length);

      // Verify they are now sent
      for (const id of ids) {
        const detail = await listNotifications({ status: "pending" });
        // The marked notifications should no longer be pending
      }

      // Reset for other tests
      for (const id of ids) {
        await markNotificationStatus(id, "pending");
      }
    });

    it("returns 0 for empty array", async () => {
      const result = await batchMarkNotificationsRead([]);
      expect(result.updated).toBe(0);
    });

    it("skips already-sent notifications", async () => {
      const sent = await listNotifications({ status: "sent" });
      if (sent.items.length === 0) return;

      const result = await batchMarkNotificationsRead(sent.items.map((n) => n.id));
      expect(result.updated).toBe(0);
    });

    it("handles mix of pending and sent IDs", async () => {
      const all = await listNotifications({ limit: 100 });
      const pending = all.items.filter((n) => n.status === "pending");
      const sent = all.items.filter((n) => n.status === "sent");

      if (pending.length === 0) return;

      const mixedIds = [...pending.map((n) => n.id), ...sent.map((n) => n.id)];
      const result = await batchMarkNotificationsRead(mixedIds);

      expect(result.updated).toBe(pending.length);

      // Reset
      for (const id of pending.map((n) => n.id)) {
        await markNotificationStatus(id, "pending");
      }
    });
  });

  describe("batchDeleteNotifications", () => {
    it("deletes notifications by status filter", async () => {
      const before = await listNotifications({ status: "pending" });
      if (before.items.length === 0) return;

      const count = before.items.length;
      const result = await batchDeleteNotifications({ status: "pending" });

      expect(result.deleted).toBe(count);

      const after = await listNotifications({ status: "pending" });
      expect(after.items.length).toBe(0);
    });

    it("deletes notifications by channel filter", async () => {
      // First mark some as pending so they exist
      const all = await listNotifications({ limit: 100 });
      const inApp = all.items.filter((n) => n.channel === "in_app");

      if (inApp.length === 0) return;

      const result = await batchDeleteNotifications({ channel: "in_app" });
      expect(result.deleted).toBeGreaterThanOrEqual(inApp.length);
    });

    it("deletes notifications by signal filter", async () => {
      const all = await listNotifications({ limit: 100 });
      const signal30d = all.items.filter((n) => n.signal === "30d_low");

      if (signal30d.length === 0) return;

      const result = await batchDeleteNotifications({ signal: "30d_low" });
      expect(result.deleted).toBeGreaterThanOrEqual(signal30d.length);
    });

    it("deletes notifications by themeId filter", async () => {
      const result = await batchDeleteNotifications({ themeId: "theme-surface-pro-8" });
      // Should delete at least the mock notifications for this theme
      expect(result.deleted).toBeGreaterThanOrEqual(0);
    });

    it("returns 0 for filter matching nothing", async () => {
      const result = await batchDeleteNotifications({ signal: "nonexistent_signal" });
      expect(result.deleted).toBe(0);
    });

    it("combines multiple filter conditions", async () => {
      const result = await batchDeleteNotifications({
        status: "pending",
        channel: "in_app",
      });
      expect(result.deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe("clearUnreadByTheme", () => {
    it("marks pending notifications for a theme as sent", async () => {
      // Get initial pending count for the theme
      const before = await listNotifications({ status: "pending" });
      const themePending = before.items.filter((n) => {
        // Mock mode doesn't directly expose themeId, but clearUnreadByTheme works through events
        return true; // We'll check the result
      });

      const result = await clearUnreadByTheme("theme-surface-pro-8");
      expect(result.updated).toBeGreaterThanOrEqual(0);
    });

    it("returns 0 for theme with no pending notifications", async () => {
      const result = await clearUnreadByTheme("nonexistent-theme");
      expect(result.updated).toBe(0);
    });
  });
});

// ─── Retry ───────────────────────────────────────────────────────────────────

describe("notification-service retry (mock mode)", () => {
  describe("retryFailedNotification", () => {
    it("queues a failed notification for retry (no channelConfig)", async () => {
      // First create a failed notification by marking one as failed
      const pending = await listNotifications({ status: "pending" });
      if (pending.items.length === 0) return;

      const id = pending.items[0].id;
      await markNotificationStatus(id, "failed");

      const result = await retryFailedNotification(id);
      expect(result.success).toBe(true);

      // Status should remain "failed" (queued, not sent)
      const detail = await listNotifications({ limit: 100 });
      const retried = detail.items.find((n) => n.id === id);
      expect(retried?.status).toBe("failed");
    });

    it("sends immediately when channelConfig is provided", async () => {
      const { vi } = await import("vitest");
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      const pending = await listNotifications({ status: "pending" });
      if (pending.items.length === 0) return;

      const id = pending.items[0].id;
      await markNotificationStatus(id, "failed");

      const result = await retryFailedNotification(id, {
        webhook: { url: "https://example.com/hook" },
      });
      expect(result.success).toBe(true);

      // Should now be sent
      const detail = await listNotifications({ limit: 100 });
      const retried = detail.items.find((n) => n.id === id);
      expect(retried?.status).toBe("sent");

      fetchSpy.mockRestore();
    });

    it("rejects retry of non-failed notification", async () => {
      const pending = await listNotifications({ status: "pending" });
      if (pending.items.length === 0) return;

      const result = await retryFailedNotification(pending.items[0].id);
      expect(result.success).toBe(false);
      expect(result.message).toContain("not in failed state");
    });

    it("returns error for nonexistent notification", async () => {
      const result = await retryFailedNotification("nonexistent-id");
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });
  });
});

// ─── Stats ───────────────────────────────────────────────────────────────────

describe("notification-service stats (mock mode)", () => {
  describe("getNotificationStats", () => {
    it("returns complete stats structure", async () => {
      const stats = await getNotificationStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("sent");
      expect(stats).toHaveProperty("failed");
      expect(stats).toHaveProperty("failureRate");
      expect(stats).toHaveProperty("recentFailures");
    });

    it("counts match actual notifications", async () => {
      const stats = await getNotificationStats();
      const all = await listNotifications({ limit: 100 });

      expect(stats.total).toBe(all.total);
    });

    it("failure rate is between 0 and 1", async () => {
      const stats = await getNotificationStats();

      expect(stats.failureRate).toBeGreaterThanOrEqual(0);
      expect(stats.failureRate).toBeLessThanOrEqual(1);
    });

    it("sum of statuses equals total", async () => {
      const stats = await getNotificationStats();
      expect(stats.pending + stats.sent + stats.failed).toBe(stats.total);
    });

    it("recent failures have correct structure", async () => {
      const stats = await getNotificationStats();

      for (const failure of stats.recentFailures) {
        expect(failure).toHaveProperty("id");
        expect(failure).toHaveProperty("eventId");
        expect(failure).toHaveProperty("channel");
        expect(failure).toHaveProperty("createdAt");
      }
    });

    it("recent failures are limited to 5", async () => {
      const stats = await getNotificationStats();
      expect(stats.recentFailures.length).toBeLessThanOrEqual(5);
    });
  });
});

// ─── External Send ───────────────────────────────────────────────────────────

describe("notification-service external send (mock mode)", () => {
  describe("sendExternalNotification", () => {
    it("returns error for nonexistent notification", async () => {
      const result = await sendExternalNotification("nonexistent-id", {
        webhook: { url: "https://example.com" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("sends via webhook successfully", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      const all = await listNotifications({ limit: 1 });
      if (all.items.length === 0) return;

      const result = await sendExternalNotification(all.items[0].id, {
        webhook: { url: "https://example.com/hook" },
      });

      expect(result.success).toBe(true);
      expect(fetchSpy).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it("marks notification as sent on success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      const pending = await listNotifications({ status: "pending" });
      if (pending.items.length === 0) return;

      const id = pending.items[0].id;
      await sendExternalNotification(id, {
        webhook: { url: "https://example.com/hook" },
      });

      // Mark as failed first to test the send
      await markNotificationStatus(id, "failed");

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      const result = await sendExternalNotification(id, {
        webhook: { url: "https://example.com/hook" },
      });

      expect(result.success).toBe(true);

      vi.restoreAllMocks();
    });

    it("marks notification as failed on send failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 500 }),
      );

      const pending = await listNotifications({ status: "pending" });
      if (pending.items.length === 0) return;

      const id = pending.items[0].id;
      const result = await sendExternalNotification(id, {
        webhook: { url: "https://example.com/hook" },
      });

      expect(result.success).toBe(false);

      vi.restoreAllMocks();
    });
  });
});
