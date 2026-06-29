import { describe, expect, it } from "vitest";

import {
  createSavedFilterView,
  deleteSavedFilterView,
  listSavedFilterViews,
  listThemeFavorites,
  setThemeFavorite,
} from "./user-preferences-service.js";
import {
  loadAllChannelConfigs,
  loadChannelConfig,
  saveChannelConfig,
} from "./channel-config-store.js";
import {
  getStockMarketCloseReportDeliveryConfig,
  updateStockMarketCloseReportDeliveryConfig,
} from "./stock-market-close-report-delivery.js";

describe("support services runtime database requirement", () => {
  it("requires DATABASE_URL for user preference services", async () => {
    await expect(listThemeFavorites()).rejects.toThrow(/DATABASE_URL/);
    await expect(setThemeFavorite("theme-surface-pro-8", true)).rejects.toThrow(/DATABASE_URL/);
    await expect(listSavedFilterViews()).rejects.toThrow(/DATABASE_URL/);
    await expect(createSavedFilterView({
      name: "Test View",
      viewType: "themes",
      filters: { status: "active" },
    })).rejects.toThrow(/DATABASE_URL/);
    await expect(deleteSavedFilterView("view-test")).rejects.toThrow(/DATABASE_URL/);
  });

  it("requires DATABASE_URL for channel config storage", async () => {
    await expect(saveChannelConfig("webhook", { webhook: { url: "https://example.com/hook" } })).rejects.toThrow(/DATABASE_URL/);
    await expect(loadChannelConfig("webhook")).rejects.toThrow(/DATABASE_URL/);
    await expect(loadAllChannelConfigs()).rejects.toThrow(/DATABASE_URL/);
  });

  it("requires DATABASE_URL for stock market close report delivery config", async () => {
    await expect(getStockMarketCloseReportDeliveryConfig()).rejects.toThrow(/DATABASE_URL/);
    await expect(updateStockMarketCloseReportDeliveryConfig({
      enabled: true,
      channel: "in_app",
      deliveryTime: "16:25",
    })).rejects.toThrow(/DATABASE_URL/);
  });
});
