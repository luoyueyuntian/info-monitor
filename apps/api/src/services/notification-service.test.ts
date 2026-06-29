import { describe, expect, it } from "vitest";

import {
  getNotificationDetail,
  listNotifications,
  markNotificationStatus,
} from "./notification-service.js";

describe("notification-service", () => {
  describe("runtime database requirement", () => {
    it("requires DATABASE_URL for notification queries and updates", async () => {
      await expect(listNotifications()).rejects.toThrow(/DATABASE_URL/);
      await expect(getNotificationDetail("notification-surface-low")).rejects.toThrow(/DATABASE_URL/);
      await expect(markNotificationStatus("notification-surface-low", "sent")).rejects.toThrow(/DATABASE_URL/);
    });
  });
});
