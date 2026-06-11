import { describe, expect, it } from "vitest";

import { filterEventsByInboxSection, listInboxSectionEvents } from "./event-service.js";

describe("event-service (mock mode)", () => {
  describe("filterEventsByInboxSection", () => {
    const events = [
      { id: "1", infoType: "price", signal: "30d_low" },
      { id: "2", infoType: "content_update", signal: "content_update" },
      { id: "3", infoType: "financial_event", signal: "bullish" },
      { id: "4", infoType: "news_announcement", signal: "new_announcement" },
      { id: "5", infoType: "financial_event", signal: "bearish" },
    ] as Array<{ id: string; infoType?: string | null; signal?: string | null }>;

    it("filters price-signals section by price infoType", () => {
      const result = filterEventsByInboxSection(events, "price-signals");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("filters content-updates section by content_update infoType", () => {
      const result = filterEventsByInboxSection(events, "content-updates");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("filters official-releases section by new_announcement signal", () => {
      const result = filterEventsByInboxSection(events, "official-releases");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("4");
    });

    it("filters financial-events section by financial_event infoType", () => {
      const result = filterEventsByInboxSection(events, "financial-events");

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toEqual(["3", "5"]);
    });

    it("returns empty array for unknown section", () => {
      const result = filterEventsByInboxSection(events, "unknown-section");

      expect(result).toHaveLength(0);
    });
  });

  describe("listInboxSectionEvents", () => {
    it("returns all events when no section specified", async () => {
      const events = await listInboxSectionEvents();

      expect(events.length).toBeGreaterThanOrEqual(4);
    });

    it("returns filtered events for price-signals section", async () => {
      const events = await listInboxSectionEvents("price-signals");

      for (const event of events) {
        expect(event.infoType).toBe("price");
      }
    });

    it("returns filtered events for financial-events section", async () => {
      const events = await listInboxSectionEvents("financial-events");

      for (const event of events) {
        expect(event.infoType).toBe("financial_event");
      }
    });

    it("each event has required fields", async () => {
      const events = await listInboxSectionEvents();

      for (const event of events) {
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("themeId");
        expect(event).toHaveProperty("themeName");
        expect(event).toHaveProperty("title");
        expect(event).toHaveProperty("signal");
        expect(event).toHaveProperty("occurredAt");
        expect(event).toHaveProperty("summary");
      }
    });
  });
});
