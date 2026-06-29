import { describe, expect, it } from "vitest";

import {
  createNotificationPreference,
  deleteNotificationPreference,
  getEffectivePreference,
  getNotificationPreference,
  listNotificationPreferences,
  updateNotificationPreference,
} from "./notification-preference-service.js";

describe("notification-preference-service", () => {
  it("requires DATABASE_URL for preference reads and writes", async () => {
    await expect(listNotificationPreferences()).rejects.toThrow(/DATABASE_URL/);
    await expect(getNotificationPreference("pref-default-theme-surface-pro-8-in_app")).rejects.toThrow(/DATABASE_URL/);
    await expect(createNotificationPreference({ channel: "email" })).rejects.toThrow(/DATABASE_URL/);
    await expect(updateNotificationPreference("pref-default-theme-surface-pro-8-in_app", { isMuted: true })).rejects.toThrow(/DATABASE_URL/);
    await expect(deleteNotificationPreference("pref-default-theme-surface-pro-8-in_app")).rejects.toThrow(/DATABASE_URL/);
    await expect(getEffectivePreference("theme-surface-pro-8")).rejects.toThrow(/DATABASE_URL/);
  });
});
