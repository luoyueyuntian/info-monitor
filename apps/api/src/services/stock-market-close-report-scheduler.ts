/**
 * Stock market close report auto-save scheduler.
 *
 * Runs on server startup. Checks every minute whether it is time to persist
 * the daily stock-market close report after market close.
 */

import { getDatabase } from "../db/client.js";
import { saveTodayStockMarketCloseReportIfNeeded } from "./stock-market-close-report-service.js";

const CHECK_INTERVAL_MS = 60_000;
const SAVE_TIME = "16:20";

// Mainland China market holiday dates for 2026, expressed in local calendar dates.
const CN_STOCK_HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-01-02",
  "2026-01-03",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-02-21",
  "2026-02-22",
  "2026-02-23",
  "2026-04-04",
  "2026-04-05",
  "2026-04-06",
  "2026-05-01",
  "2026-05-02",
  "2026-05-03",
  "2026-05-04",
  "2026-05-05",
  "2026-06-19",
  "2026-06-20",
  "2026-06-21",
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
]);

let lastSavedDate: string | null = null;

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

function isTradingDay(date: Date): boolean {
  const cstDate = toCstDate(date);
  const cstWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(date);

  if (cstWeekday === "Sat" || cstWeekday === "Sun") {
    return false;
  }

  if (CN_STOCK_HOLIDAYS_2026.has(cstDate)) {
    return false;
  }

  return true;
}

async function checkAndSave() {
  try {
    const db = getDatabase();
    if (!db) {
      return;
    }

    const now = new Date();
    const today = toCstDate(now);
    const currentTime = toCstTime(now);

    if (lastSavedDate === today) {
      return;
    }

    if (!isTradingDay(now)) {
      return;
    }

    if (currentTime !== SAVE_TIME) {
      return;
    }

    const snapshot = await saveTodayStockMarketCloseReportIfNeeded();
    if (snapshot) {
      lastSavedDate = today;
      console.log(`[stock-market-close-report-scheduler] Saved stock market close report for ${today}`);
    }
  } catch (error) {
    console.error("[stock-market-close-report-scheduler] Error during scheduled save:", error);
  }
}

export function startStockMarketCloseReportScheduler() {
  console.log("[stock-market-close-report-scheduler] Starting scheduler (checking every minute)");
  setInterval(checkAndSave, CHECK_INTERVAL_MS);
}
