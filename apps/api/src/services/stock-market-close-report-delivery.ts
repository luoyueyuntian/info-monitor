import type { NotificationChannel, StockMarketCloseReport } from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";
import { loadChannelConfig } from "./channel-config-store.js";
import {
  sendNotification,
  type ChannelConfig,
  type NotificationPayload,
} from "./notification-channels.js";
import { getStockMarketCloseReport } from "./stock-market-close-report-service.js";

export type StockMarketCloseReportDeliveryConfig = {
  enabled: boolean;
  channel: string;
  deliveryTime: string;
};

const STOCK_MARKET_REPORT_SIGNAL_PREFIX = "stock_market_close_report";

function parseDeliveryTimeFromSignal(signal: string): string {
  const parts = signal.split(":");
  if (parts.length === 3 && parts[0] === STOCK_MARKET_REPORT_SIGNAL_PREFIX) {
    return `${parts[1]}:${parts[2]}`;
  }
  return "16:25";
}

export async function getStockMarketCloseReportDeliveryConfig(): Promise<StockMarketCloseReportDeliveryConfig> {
  const db = getDatabase();

  if (!db) {
    return { enabled: false, channel: "in_app", deliveryTime: "16:25" };
  }

  const row = await db
    .selectFrom("notification_preferences")
    .select(["channel", "is_enabled", "signal"])
    .where("signal", "like", `${STOCK_MARKET_REPORT_SIGNAL_PREFIX}%`)
    .executeTakeFirst();

  if (!row) {
    return { enabled: false, channel: "in_app", deliveryTime: "16:25" };
  }

  return {
    enabled: row.is_enabled,
    channel: row.channel,
    deliveryTime: parseDeliveryTimeFromSignal(row.signal ?? ""),
  };
}

export async function updateStockMarketCloseReportDeliveryConfig(
  config: StockMarketCloseReportDeliveryConfig,
): Promise<StockMarketCloseReportDeliveryConfig> {
  const db = getDatabase();

  if (!db) {
    return config;
  }

  await db
    .deleteFrom("notification_preferences")
    .where("signal", "like", `${STOCK_MARKET_REPORT_SIGNAL_PREFIX}%`)
    .execute();

  await db
    .insertInto("notification_preferences")
    .values({
      id: createId("notif_pref"),
      user_id: "default",
      channel: config.channel,
      signal: `${STOCK_MARKET_REPORT_SIGNAL_PREFIX}:${config.deliveryTime}`,
      is_enabled: config.enabled,
      is_muted: false,
      priority_only: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .execute();

  return config;
}

function formatReportForDelivery(report: StockMarketCloseReport): { title: string; body: string } {
  const title = `Stock Market Close Report — ${report.date}`;
  const lines = [
    report.headline,
    report.summary,
    ...report.keySignals.slice(0, 3).map((item) => `• ${item}`),
    ...report.actionItems.slice(0, 2).map((item) => `→ ${item}`),
  ];

  return { title, body: lines.join("\n") };
}

export async function deliverStockMarketCloseReport(
  channel: NotificationChannel = "in_app",
  channelConfig?: ChannelConfig,
): Promise<{ delivered: boolean; notificationId?: string; error?: string }> {
  const report = await getStockMarketCloseReport();
  if (!report) {
    return { delivered: false, error: "Stock market close report not available" };
  }

  const { title, body } = formatReportForDelivery(report);
  const db = getDatabase();
  const notificationId = createId("notification");
  const now = new Date().toISOString();

  if (channel !== "in_app") {
    const resolvedConfig = channelConfig ?? await loadChannelConfig(channel);
    if (!resolvedConfig) {
      return { delivered: false, error: `channelConfig required for ${channel} delivery` };
    }

    const payload: NotificationPayload = {
      id: notificationId,
      eventId: "",
      channel,
      title,
      summary: body,
      signal: "stock_market_close_report",
      metadata: {
        date: report.date,
      },
    };

    const result = await sendNotification(payload, resolvedConfig);
    if (!result.success) {
      return { delivered: false, error: result.error };
    }

    if (db) {
      await db
        .insertInto("notifications")
        .values({
          id: notificationId,
          event_id: null,
          channel,
          status: "sent",
          payload: JSON.stringify({ title, summary: body, signal: "stock_market_close_report", date: report.date }),
          sent_at: now,
          created_at: now,
          retry_count: 0,
          max_retries: 0,
        })
        .execute();
    }

    return { delivered: true, notificationId };
  }

  if (db) {
    await db
      .insertInto("notifications")
      .values({
        id: notificationId,
        event_id: null,
        channel,
        status: "sent",
        payload: JSON.stringify({ title, summary: body, signal: "stock_market_close_report", date: report.date }),
        sent_at: now,
        created_at: now,
        retry_count: 0,
        max_retries: 0,
      })
      .execute();
  }

  return { delivered: true, notificationId };
}
