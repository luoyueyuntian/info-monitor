import { describe, expect, it } from "vitest";

import {
  getAuditLogs,
  getNotificationTimeline,
  logAuditEvent,
} from "./notification-audit-service.js";

describe("notification-audit-service", () => {
  it("requires DATABASE_URL for audit writes and reads", async () => {
    await expect(logAuditEvent("notif-test-001", "created", null, "pending", "system")).rejects.toThrow(/DATABASE_URL/);
    await expect(getAuditLogs()).rejects.toThrow(/DATABASE_URL/);
    await expect(getNotificationTimeline("notification-surface-low")).rejects.toThrow(/DATABASE_URL/);
  });
});
