import { describe, expect, it, beforeEach } from "vitest";

import { getThemeReviewNote, updateThemeReviewNote } from "./theme-service.js";
import { mockThemes } from "../lib/mock-store.js";

describe("theme-review-note (mock mode)", () => {
  const testThemeId = "theme-surface-pro-8";

  beforeEach(() => {
    // Reset the theme metadata before each test
    const theme = mockThemes.find((t) => t.id === testThemeId);
    if (theme) {
      (theme as Record<string, unknown>).metadata = {};
    }
  });

  describe("getThemeReviewNote", () => {
    it("returns empty content when no review note exists", async () => {
      const note = await getThemeReviewNote(testThemeId);

      expect(note).not.toBeNull();
      expect(note?.content).toBe("");
      expect(note?.updatedAt).toBeNull();
    });

    it("returns null for non-existent theme", async () => {
      const note = await getThemeReviewNote("non-existent-theme");

      expect(note).toBeNull();
    });
  });

  describe("updateThemeReviewNote", () => {
    it("creates a new review note", async () => {
      const updated = await updateThemeReviewNote(testThemeId, {
        content: "Test review note content",
      });

      expect(updated).not.toBeNull();
      expect(updated?.content).toBe("Test review note content");
      expect(updated?.updatedAt).not.toBeNull();
    });

    it("persists review note across reads", async () => {
      await updateThemeReviewNote(testThemeId, {
        content: "Persistent content",
      });

      const note = await getThemeReviewNote(testThemeId);

      expect(note?.content).toBe("Persistent content");
      expect(note?.updatedAt).not.toBeNull();
    });

    it("updates existing review note", async () => {
      await updateThemeReviewNote(testThemeId, {
        content: "Original content",
      });

      const updated = await updateThemeReviewNote(testThemeId, {
        content: "Updated content",
      });

      expect(updated?.content).toBe("Updated content");

      const note = await getThemeReviewNote(testThemeId);
      expect(note?.content).toBe("Updated content");
    });

    it("saves structured fields", async () => {
      const updated = await updateThemeReviewNote(testThemeId, {
        content: "Structured review",
        status: "tracking",
        tags: ["price_opportunity", "risk_alert"],
        nextReviewDate: "2026-07-01",
      });

      expect(updated?.status).toBe("tracking");
      expect(updated?.tags).toEqual(["price_opportunity", "risk_alert"]);
      expect(updated?.nextReviewDate).toBe("2026-07-01");
    });

    it("persists structured fields across reads", async () => {
      await updateThemeReviewNote(testThemeId, {
        content: "Structured review",
        status: "reviewed",
        tags: ["competitor_tracking"],
        nextReviewDate: "2026-08-15",
      });

      const note = await getThemeReviewNote(testThemeId);

      expect(note?.content).toBe("Structured review");
      expect(note?.status).toBe("reviewed");
      expect(note?.tags).toEqual(["competitor_tracking"]);
      expect(note?.nextReviewDate).toBe("2026-08-15");
    });

    it("returns null for non-existent theme", async () => {
      const result = await updateThemeReviewNote("non-existent-theme", {
        content: "Test",
      });

      expect(result).toBeNull();
    });
  });
});
