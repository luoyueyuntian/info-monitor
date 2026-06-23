import { describe, expect, it, beforeEach } from "vitest";

import { createSource, validateSourceConfig, getSourceDetail } from "./source-service.js";
import { mockEvents, mockSources } from "../lib/mock-store.js";

describe("source-service (mock mode)", () => {
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

  describe("getSourceDetail", () => {
    it("returns null for non-existent source", async () => {
      const detail = await getSourceDetail("non-existent-source");

      expect(detail).toBeNull();
    });

    it("returns source detail with runs for existing source", async () => {
      const source = mockSources.find((s) => s.id === "source-xianyu-surface");
      expect(source).toBeDefined();

      const detail = await getSourceDetail("source-xianyu-surface");

      expect(detail).not.toBeNull();
      expect(detail?.source.id).toBe("source-xianyu-surface");
      expect(detail?.runs.length).toBeGreaterThanOrEqual(1);
    });

    it("each run has per-run count fields", async () => {
      const detail = await getSourceDetail("source-xianyu-surface");

      expect(detail).not.toBeNull();

      for (const run of detail!.runs) {
        expect(typeof run.snapshotCount).toBe("number");
        expect(typeof run.recordCount).toBe("number");
        expect(typeof run.changeCount).toBe("number");
        expect(typeof run.eventCount).toBe("number");
      }
    });

    it("run eventCount reflects actual theme events in mock mode", async () => {
      const detail = await getSourceDetail("source-xianyu-surface");

      expect(detail).not.toBeNull();

      const run = detail!.runs[0];
      const themeEvents = mockEvents.filter(
        (e) => e.themeId === "theme-surface-pro-8",
      );

      // eventCount is set from events matching the source's theme
      expect(run.eventCount).toBe(themeEvents.length);
    });

    it("snapshotCount defaults to 0 in mock mode (no real snapshots)", async () => {
      const detail = await getSourceDetail("source-xianyu-surface");

      expect(detail).not.toBeNull();
      expect(detail!.runs[0].snapshotCount).toBe(0);
    });

    it("recordCount and changeCount default to 0 in mock mode", async () => {
      const detail = await getSourceDetail("source-xianyu-surface");

      expect(detail).not.toBeNull();
      expect(detail!.runs[0].recordCount).toBe(0);
      expect(detail!.runs[0].changeCount).toBe(0);
    });

    it("source with no events has eventCount 0", async () => {
      // eastmoney-moutai theme has no events in mock fixtures
      const detail = await getSourceDetail("source-eastmoney-moutai-kline");

      expect(detail).not.toBeNull();
      expect(detail!.runs[0].eventCount).toBe(0);
    });

    it("returns records, changes, snapshots arrays", async () => {
      const detail = await getSourceDetail("source-xianyu-surface");

      expect(detail).not.toBeNull();
      expect(Array.isArray(detail!.records)).toBe(true);
      expect(Array.isArray(detail!.changes)).toBe(true);
      expect(Array.isArray(detail!.snapshots)).toBe(true);
      expect(Array.isArray(detail!.events)).toBe(true);
    });
  });
});
