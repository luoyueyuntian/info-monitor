import { describe, expect, it } from "vitest";

import { createSource, getSourceDetail, listSourceStatuses, validateSourceConfig } from "./source-service.js";

describe("source-service", () => {
  describe("validation", () => {
    it("requires url for generic content update adapters even without presetId", () => {
      const result = validateSourceConfig({
        name: "Product Update Feed",
        sourceType: "page_list",
        adapterKey: "generic_content_update_list",
        config: {
          schedule_interval_seconds: 21600,
          emit_events_on_latest_only: true,
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required field: url");
    });

    it("rejects creating a source when adapter-required config is missing", async () => {
      await expect(
        createSource({
          themeId: "theme-surface-pro-8",
          name: "Official Announcement API",
          sourceType: "api",
          adapterKey: "generic_news_announcement_list",
          config: {
            title_field: "title",
            category: "exchange_announcement",
          },
          onboardingStatus: "active",
        }),
      ).rejects.toThrow("Missing required field: url");
    });
  });

  describe("runtime database requirement", () => {
    it("requires DATABASE_URL for source detail access", async () => {
      await expect(getSourceDetail("source-xianyu-surface")).rejects.toThrow(/DATABASE_URL/);
    });

    it("requires DATABASE_URL for listing source statuses", async () => {
      await expect(listSourceStatuses()).rejects.toThrow(/DATABASE_URL/);
    });

    it("requires DATABASE_URL when creating a valid source", async () => {
      await expect(
        createSource({
          themeId: "theme-surface-pro-8",
          name: "Official Announcement API",
          sourceType: "page_list",
          adapterKey: "generic_content_update_list",
          config: {
            url: "https://example.com/feed",
            item_selector: ".item",
            title_selector: ".title",
          },
          onboardingStatus: "active",
        }),
      ).rejects.toThrow(/DATABASE_URL/);
    });
  });
});
