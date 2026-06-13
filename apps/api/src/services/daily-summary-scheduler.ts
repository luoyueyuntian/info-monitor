/**
 * Daily summary auto-delivery scheduler.
 *
 * Runs on server startup. Checks every minute if it's time to deliver
 * the daily summary based on the user's configured delivery time.
 */

import { getDatabase } from "../db/client.js";
import { deliverDailySummary } from "./daily-summary-service.js";
import { loadChannelConfig } from "./channel-config-store.js";

const DAILY_SUMMARY_SIGNAL_PREFIX = "daily_summary";
const CHECK_INTERVAL_MS = 60_000; // 1 minute

// Track the last delivery date to avoid duplicate deliveries
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

async function loadConfig(): Promise<{ enabled: boolean; channel: string; deliveryTime: string } | null> {
  const db = getDatabase();

  if (!db) {
    // Mock mode — no scheduler needed
    return null;
  }

  const row = await db
    .selectFrom("notification_preferences")
    .select(["channel", "is_enabled", "signal"])
    .where("signal", "like", `${DAILY_SUMMARY_SIGNAL_PREFIX}%`)
    .executeTakeFirst();

  if (!row || !row.is_enabled) {
    return null;
  }

  // Parse deliveryTime from signal: "daily_summary:HH:MM"
  const parts = (row.signal ?? "").split(":");
  const deliveryTime = parts.length === 3 ? `${parts[1]}:${parts[2]}` : "09:00";

  return {
    enabled: row.is_enabled,
    channel: row.channel,
    deliveryTime,
  };
}

async function checkAndDeliver() {
  try {
    const config = await loadConfig();
    if (!config || !config.enabled) {
      return;
    }

    const now = new Date();
    const today = toCstDate(now);
    const currentTime = toCstTime(now);

    // Check if we already delivered today
    if (lastDeliveryDate === today) {
      return;
    }

    // Check if it's time to deliver (within a 1-minute window)
    if (currentTime !== config.deliveryTime) {
      return;
    }

    // Load channel config for external channels
    let channelConfig = undefined;
    if (config.channel !== "in_app") {
      channelConfig = await loadChannelConfig(config.channel) ?? undefined;
      if (!channelConfig) {
        console.error(`[daily-summary-scheduler] No channel config found for ${config.channel}, skipping delivery`);
        return;
      }
    }

    // Deliver!
    console.log(`[daily-summary-scheduler] Delivering daily summary via ${config.channel} at ${currentTime}`);
    const result = await deliverDailySummary(config.channel as any, channelConfig);

    if (result.delivered) {
      lastDeliveryDate = today;
      console.log(`[daily-summary-scheduler] Daily summary delivered successfully: ${result.notificationId}`);
    } else {
      console.error(`[daily-summary-scheduler] Delivery failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[daily-summary-scheduler] Error during scheduled delivery:", error);
  }
}

/**
 * Start the daily summary scheduler.
 * Call this once during server startup.
 */
export function startDailySummaryScheduler() {
  console.log("[daily-summary-scheduler] Starting scheduler (checking every minute)");
  setInterval(checkAndDeliver, CHECK_INTERVAL_MS);
}
