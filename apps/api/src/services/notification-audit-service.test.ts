import { describe, expect, it, vi } from "vitest";

// Force mock mode by returning null from getDatabase
vi.mock("../db/client.js", () => ({
  getDatabase: () => null,
}));

import {
  logAuditEvent,
  getAuditLogs,
  getNotificationTimeline,
  type AuditAction,
} from "./notification-audit-service.js";

describe("notification-audit-service (mock mode)", () => {
  const baselineCount = 3; // 3 mock entries in mock-fixtures

  describe("logAuditEvent", () => {
    it("creates a new audit log entry", async () => {
      const before = await getAuditLogs();
      await logAuditEvent("notif-test-001", "created", null, "pending", "system");
      const after = await getAuditLogs();

      expect(after.total).toBe(before.total + 1);

      const newest = after.items[0]; // sorted desc
      expect(newest.notificationId).toBe("notif-test-001");
      expect(newest.action).toBe("created");
      expect(newest.fromStatus).toBeNull();
      expect(newest.toStatus).toBe("pending");
      expect(newest.actor).toBe("system");
    });

    it("supports all audit action types", async () => {
      const actions: AuditAction[] = ["created", "sent", "failed", "read", "retried", "deleted"];

      for (const action of actions) {
        await logAuditEvent(`notif-action-${action}`, action, null, null, "test");
      }

      for (const action of actions) {
        const timeline = await getNotificationTimeline(`notif-action-${action}`);
        expect(timeline.length).toBeGreaterThanOrEqual(1);
        expect(timeline.some((e) => e.action === action)).toBe(true);
        expect(timeline.some((e) => e.actor === "test")).toBe(true);
      }
    });

    it("stores metadata alongside the audit entry", async () => {
      await logAuditEvent("notif-meta", "sent", "pending", "sent", "system", {
        channel: "webhook",
        attempt: 2,
      });

      const { items } = await getAuditLogs({ notificationId: "notif-meta" });
      expect(items).toHaveLength(1);
      expect(items[0].metadata).toEqual({ channel: "webhook", attempt: 2 });
    });

    it("uses default actor 'system' when not specified", async () => {
      await logAuditEvent("notif-default-actor", "created", null, "pending");
      const { items } = await getAuditLogs({ notificationId: "notif-default-actor" });
      expect(items[0].actor).toBe("system");
    });
  });

  describe("getAuditLogs", () => {
    it("returns all logs with pagination", async () => {
      const result = await getAuditLogs();

      expect(result.total).toBeGreaterThanOrEqual(baselineCount);
      expect(result.items.length).toBeGreaterThanOrEqual(baselineCount);
    });

    it("filters by notificationId", async () => {
      const result = await getAuditLogs({ notificationId: "notification-pbc-injection" });

      expect(result.total).toBe(2); // created + sent in mock fixtures
      for (const log of result.items) {
        expect(log.notificationId).toBe("notification-pbc-injection");
      }
    });

    it("filters by action", async () => {
      const result = await getAuditLogs({ action: "created" });

      expect(result.total).toBeGreaterThanOrEqual(2); // 2 created entries in mock
      for (const log of result.items) {
        expect(log.action).toBe("created");
      }
    });

    it("filters by both notificationId and action", async () => {
      const result = await getAuditLogs({
        notificationId: "notification-pbc-injection",
        action: "sent",
      });

      expect(result.total).toBe(1);
      expect(result.items[0].action).toBe("sent");
      expect(result.items[0].notificationId).toBe("notification-pbc-injection");
    });

    it("respects limit option", async () => {
      const result = await getAuditLogs({ limit: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBeGreaterThanOrEqual(baselineCount);
    });

    it("supports offset-based pagination", async () => {
      const first = await getAuditLogs({ limit: 1, offset: 0 });
      const second = await getAuditLogs({ limit: 1, offset: 1 });

      expect(first.items).toHaveLength(1);
      expect(second.items).toHaveLength(1);
      expect(first.items[0].id).not.toBe(second.items[0].id);
    });

    it("returns items sorted by createdAt descending", async () => {
      const result = await getAuditLogs({ limit: 100 });

      for (let i = 1; i < result.items.length; i++) {
        const prev = new Date(result.items[i - 1].createdAt).getTime();
        const curr = new Date(result.items[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it("returns empty items for nonexistent notification", async () => {
      const result = await getAuditLogs({ notificationId: "does-not-exist" });

      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe("getNotificationTimeline", () => {
    it("returns chronological timeline for a notification", async () => {
      const timeline = await getNotificationTimeline("notification-pbc-injection");

      expect(timeline).toHaveLength(2);
      expect(timeline[0].action).toBe("created");
      expect(timeline[1].action).toBe("sent");
      expect(timeline[0].createdAt <= timeline[1].createdAt).toBe(true);
    });

    it("returns empty array for nonexistent notification", async () => {
      const timeline = await getNotificationTimeline("does-not-exist");

      expect(timeline).toHaveLength(0);
    });

    it("includes all state transitions", async () => {
      await logAuditEvent("notif-timeline", "created", null, "pending");
      await logAuditEvent("notif-timeline", "sent", "pending", "sent");
      await logAuditEvent("notif-timeline", "read", "sent", "read");

      const timeline = await getNotificationTimeline("notif-timeline");

      expect(timeline).toHaveLength(3);
      expect(timeline[0].action).toBe("created");
      expect(timeline[1].action).toBe("sent");
      expect(timeline[2].action).toBe("read");
    });
  });
});
