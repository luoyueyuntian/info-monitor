import { getDatabase } from "../db/client.js";
import { loadChannelConfig } from "./channel-config-store.js";
import {
  deliverStockMarketCloseReport,
  getStockMarketCloseReportDeliveryConfig,
} from "./stock-market-close-report-delivery.js";

const CHECK_INTERVAL_MS = 60_000;

let lastDeliveryDate: string | null = null;

function toCstDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

function toCstTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function checkAndDeliver() {
  try {
    const db = getDatabase();
    if (!db) {
      return;
    }

    const config = await getStockMarketCloseReportDeliveryConfig();
    if (!config.enabled) {
      return;
    }

    const now = new Date();
    const today = toCstDate(now);
    const currentTime = toCstTime(now);

    if (lastDeliveryDate === today) {
      return;
    }

    if (currentTime !== config.deliveryTime) {
      return;
    }

    const channelConfig = config.channel !== "in_app"
      ? (await loadChannelConfig(config.channel)) ?? undefined
      : undefined;

    const result = await deliverStockMarketCloseReport(config.channel as any, channelConfig);
    if (result.delivered) {
      lastDeliveryDate = today;
      console.log(`[stock-market-close-report-delivery-scheduler] Delivered stock market close report via ${config.channel}`);
    } else {
      console.error(`[stock-market-close-report-delivery-scheduler] Delivery failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[stock-market-close-report-delivery-scheduler] Error during scheduled delivery:", error);
  }
}

export function startStockMarketCloseReportDeliveryScheduler() {
  console.log("[stock-market-close-report-delivery-scheduler] Starting scheduler (checking every minute)");
  setInterval(checkAndDeliver, CHECK_INTERVAL_MS);
}
