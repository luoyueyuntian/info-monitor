import { describe, expect, it } from "vitest";

import {
  getStockMarketCloseReport,
  getStockMarketCloseReportHistory,
  getStockMarketCloseReportSnapshotByDate,
  hasStockMarketCloseReportForDate,
  saveStockMarketCloseReportSnapshot,
  saveTodayStockMarketCloseReportIfNeeded,
} from "./stock-market-close-report-service.js";

describe("stock-market-close-report-service runtime database requirement", () => {
  it("requires DATABASE_URL for report generation and history access", async () => {
    await expect(getStockMarketCloseReport()).rejects.toThrow(/DATABASE_URL/);
    await expect(getStockMarketCloseReportHistory()).rejects.toThrow(/DATABASE_URL/);
    await expect(getStockMarketCloseReportSnapshotByDate("2026-06-29")).rejects.toThrow(/DATABASE_URL/);
    await expect(hasStockMarketCloseReportForDate("2026-06-29")).rejects.toThrow(/DATABASE_URL/);
    await expect(saveTodayStockMarketCloseReportIfNeeded()).rejects.toThrow(/DATABASE_URL/);
  });

  it("requires DATABASE_URL for saving snapshots directly", async () => {
    await expect(saveStockMarketCloseReportSnapshot({
      date: "2026-06-29",
      headline: "test",
      summary: "test",
      keySignals: [],
      timeline: [],
      catalystSummary: {
        primary: [],
        secondary: [],
        background: [],
      },
      sectorFocus: [],
      moverFocus: [],
      announcementFocus: [],
      sourceClues: [],
      moverCards: [],
      actionItems: [],
    })).rejects.toThrow(/DATABASE_URL/);
  });
});
