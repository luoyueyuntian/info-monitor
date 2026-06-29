import { describe, expect, it } from "vitest";

import { getThemeReviewNote, updateThemeReviewNote } from "./theme-service.js";

describe("theme-review-note", () => {
  const testThemeId = "theme-surface-pro-8";

  describe("getThemeReviewNote", () => {
    it("requires DATABASE_URL for reads", async () => {
      await expect(getThemeReviewNote(testThemeId)).rejects.toThrow(/DATABASE_URL/);
    });
  });

  describe("updateThemeReviewNote", () => {
    it("requires DATABASE_URL for writes", async () => {
      await expect(
        updateThemeReviewNote(testThemeId, {
          content: "Structured review",
          status: "tracking",
          tags: ["price_opportunity", "risk_alert"],
          nextReviewDate: "2026-07-01",
        }),
      ).rejects.toThrow(/DATABASE_URL/);
    });
  });
});
