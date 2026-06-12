import { describe, expect, it, vi } from "vitest";

// Force mock mode
vi.mock("../db/client.js", () => ({
  getDatabase: () => null,
}));

import {
  listNotificationPreferences,
  getNotificationPreference,
  createNotificationPreference,
  updateNotificationPreference,
  deleteNotificationPreference,
  getEffectivePreference,
} from "./notification-preference-service.js";

describe("notification-preference-service (mock mode)", () => {
  describe("listNotificationPreferences", () => {
    it("returns default user preferences", async () => {
      const prefs = await listNotificationPreferences();

      expect(prefs.length).toBeGreaterThanOrEqual(3); // 3 mock preferences
      for (const p of prefs) {
        expect(p.userId).toBe("default");
      }
    });

    it("returns empty for unknown user", async () => {
      const prefs = await listNotificationPreferences("unknown-user");
      expect(prefs).toHaveLength(0);
    });

    it("preferences have correct structure", async () => {
      const prefs = await listNotificationPreferences();

      for (const p of prefs) {
        expect(p).toHaveProperty("id");
        expect(p).toHaveProperty("userId");
        expect(p).toHaveProperty("channel");
        expect(p).toHaveProperty("isEnabled");
        expect(p).toHaveProperty("isMuted");
        expect(p).toHaveProperty("priorityOnly");
        expect(p).toHaveProperty("createdAt");
        expect(p).toHaveProperty("updatedAt");
      }
    });
  });

  describe("getNotificationPreference", () => {
    it("returns preference by ID", async () => {
      const pref = await getNotificationPreference("pref-default-theme-surface-pro-8-in_app");

      expect(pref).not.toBeNull();
      expect(pref?.id).toBe("pref-default-theme-surface-pro-8-in_app");
      expect(pref?.themeId).toBe("theme-surface-pro-8");
    });

    it("returns null for nonexistent ID", async () => {
      const pref = await getNotificationPreference("does-not-exist");
      expect(pref).toBeNull();
    });
  });

  describe("createNotificationPreference", () => {
    it("creates a new preference", async () => {
      const created = await createNotificationPreference({
        themeId: "theme-test",
        channel: "webhook",
        isEnabled: true,
        isMuted: false,
        priorityOnly: true,
      });

      expect(created.id).toBeTruthy();
      expect(created.themeId).toBe("theme-test");
      expect(created.channel).toBe("webhook");
      expect(created.isEnabled).toBe(true);
      expect(created.isMuted).toBe(false);
      expect(created.priorityOnly).toBe(true);
      expect(created.userId).toBe("default");

      const all = await listNotificationPreferences();
      expect(all.some((p) => p.id === created.id)).toBe(true);
    });

    it("applies defaults for optional fields", async () => {
      const created = await createNotificationPreference({});

      expect(created.channel).toBe("in_app");
      expect(created.isEnabled).toBe(true);
      expect(created.isMuted).toBe(false);
      expect(created.priorityOnly).toBe(false);
      expect(created.themeId).toBeNull();
      expect(created.sourceId).toBeNull();
      expect(created.signal).toBeNull();
    });
  });

  describe("updateNotificationPreference", () => {
    it("updates an existing preference", async () => {
      const created = await createNotificationPreference({ themeId: "theme-update-test" });

      const updated = await updateNotificationPreference(created.id, {
        isMuted: true,
        priorityOnly: true,
      });

      expect(updated).not.toBeNull();
      expect(updated?.isMuted).toBe(true);
      expect(updated?.priorityOnly).toBe(true);
      expect(updated?.themeId).toBe("theme-update-test");
    });

    it("returns null for nonexistent preference", async () => {
      const result = await updateNotificationPreference("does-not-exist", { isMuted: true });
      expect(result).toBeNull();
    });

    it("updates the updatedAt timestamp", async () => {
      const created = await createNotificationPreference({ themeId: "theme-timestamp" });
      const originalUpdated = created.updatedAt;

      await new Promise((r) => setTimeout(r, 10));

      const updated = await updateNotificationPreference(created.id, { isMuted: true });
      expect(updated?.updatedAt).not.toBe(originalUpdated);
    });
  });

  describe("deleteNotificationPreference", () => {
    it("deletes an existing preference", async () => {
      const created = await createNotificationPreference({ themeId: "theme-delete" });

      const deleted = await deleteNotificationPreference(created.id);
      expect(deleted).toBe(true);

      const found = await getNotificationPreference(created.id);
      expect(found).toBeNull();
    });

    it("returns false for nonexistent preference", async () => {
      const result = await deleteNotificationPreference("does-not-exist");
      expect(result).toBe(false);
    });
  });

  describe("getEffectivePreference", () => {
    it("finds theme-level preference", async () => {
      const effective = await getEffectivePreference("theme-surface-pro-8");

      expect(effective).not.toBeNull();
      expect(effective?.isEnabled).toBe(true);
    });

    it("finds signal-level preference", async () => {
      const effective = await getEffectivePreference(undefined, undefined, "30d_low");

      expect(effective).not.toBeNull();
      expect(effective?.isEnabled).toBe(true);
    });

    it("returns null when no preference matches", async () => {
      const effective = await getEffectivePreference(
        "nonexistent-theme",
        "nonexistent-source",
        "nonexistent_signal",
        "nonexistent_channel",
      );

      expect(effective).toBeNull();
    });

    it("prefers more specific preferences (source > theme > signal)", async () => {
      await createNotificationPreference({
        themeId: "theme-surface-pro-8",
        sourceId: "source-specific",
        channel: "in_app",
        isEnabled: false,
        isMuted: true,
      });

      const effective = await getEffectivePreference("theme-surface-pro-8", "source-specific", undefined);
      expect(effective).not.toBeNull();
      expect(effective?.isEnabled).toBe(false);
      expect(effective?.isMuted).toBe(true);
    });
  });
});
