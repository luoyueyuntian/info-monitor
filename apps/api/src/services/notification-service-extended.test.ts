import { describe, expect, it, vi, beforeEach } from "vitest";

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

describe("notification-service extended runtime requirements", () => {
  it("requires DATABASE_URL for batch and retry operations", async () => {
    await expect(batchMarkNotificationsRead([])).rejects.toThrow(/DATABASE_URL/);
    await expect(batchDeleteNotifications({ status: "pending" })).rejects.toThrow(/DATABASE_URL/);
    await expect(clearUnreadByTheme("theme-surface-pro-8")).rejects.toThrow(/DATABASE_URL/);
    await expect(retryFailedNotification("notification-surface-low")).rejects.toThrow(/DATABASE_URL/);
    await expect(getNotificationStats()).rejects.toThrow(/DATABASE_URL/);
    await expect(sendExternalNotification("notification-surface-low", {
      webhook: { url: "https://example.com/hook" },
    })).rejects.toThrow(/DATABASE_URL/);
    await expect(listNotifications()).rejects.toThrow(/DATABASE_URL/);
    await expect(markNotificationStatus("notification-surface-low", "sent")).rejects.toThrow(/DATABASE_URL/);
  });
});
