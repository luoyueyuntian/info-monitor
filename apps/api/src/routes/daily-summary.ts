import type { FastifyInstance } from "fastify";

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";
import { deliverDailySummary, getDailySummary } from "../services/daily-summary-service.js";
import { getSummaryHistory, compareWithYesterday, saveDailySummarySnapshot, hasSnapshotForToday } from "../services/daily-summary-history.js";
import type { ChannelConfig } from "../services/notification-channels.js";

type DailySummaryConfig = {
  enabled: boolean;
  channel: string;
  deliveryTime: string;
};

const DAILY_SUMMARY_SIGNAL_PREFIX = "daily_summary";

function requireDatabase() {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  return db;
}

function parseDeliveryTimeFromSignal(signal: string): string {
  // signal format: "daily_summary:HH:MM" or just "daily_summary"
  const parts = signal.split(":");
  if (parts.length === 3 && parts[0] === DAILY_SUMMARY_SIGNAL_PREFIX) {
    return `${parts[1]}:${parts[2]}`;
  }
  return "09:00";
}

async function getDailySummaryConfig(): Promise<DailySummaryConfig> {
  const db = requireDatabase();

  const row = await db
    .selectFrom("notification_preferences")
    .select(["channel", "is_enabled", "signal"])
    .where("signal", "like", `${DAILY_SUMMARY_SIGNAL_PREFIX}%`)
    .executeTakeFirst();

  if (!row) {
    return { enabled: false, channel: "in_app", deliveryTime: "09:00" };
  }

  return {
    enabled: row.is_enabled,
    channel: row.channel,
    deliveryTime: parseDeliveryTimeFromSignal(row.signal ?? ""),
  };
}

async function updateDailySummaryConfig(config: DailySummaryConfig): Promise<DailySummaryConfig> {
  const db = requireDatabase();

  // Upsert: delete existing daily_summary pref (any signal starting with prefix), insert new one
  await db
    .deleteFrom("notification_preferences")
    .where("signal", "like", `${DAILY_SUMMARY_SIGNAL_PREFIX}%`)
    .execute();

  await db
    .insertInto("notification_preferences")
    .values({
      id: createId("notif_pref"),
      user_id: "default",
      channel: config.channel,
      signal: `${DAILY_SUMMARY_SIGNAL_PREFIX}:${config.deliveryTime}`,
      is_enabled: config.enabled,
      is_muted: false,
      priority_only: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .execute();

  return config;
}

export async function registerDailySummaryRoutes(app: FastifyInstance) {
  app.get("/api/daily-summary", async () => getDailySummary());

  app.get("/api/daily-summary/history", async (request) => {
    const query = request.query as { limit?: string };
    let limit = query.limit ? parseInt(query.limit, 10) : 7;
    if (!Number.isInteger(limit) || limit <= 0) {
      limit = 7;
    }
    return getSummaryHistory(limit);
  });

  app.get("/api/daily-summary/compare", async () => {
    const today = await getDailySummary();
    // Only save snapshot if one doesn't already exist for today
    const alreadySaved = await hasSnapshotForToday(today.date);
    if (!alreadySaved) {
      await saveDailySummarySnapshot(today);
    }
    return compareWithYesterday(today);
  });

  app.post("/api/daily-summary/deliver", async (request, reply) => {
    const body = request.body as { channel?: string; channelConfig?: ChannelConfig } | undefined;
    const channel = (body?.channel as "in_app" | "email" | "webhook" | "telegram") ?? "in_app";

    const result = await deliverDailySummary(channel, body?.channelConfig);

    if (!result.delivered) {
      reply.code(500);
      return { message: result.error ?? "Delivery failed" };
    }

    return result;
  });

  // Daily summary subscription config
  app.get("/api/daily-summary/config", async () => getDailySummaryConfig());

  app.put<{ Body: DailySummaryConfig }>("/api/daily-summary/config", async (request, reply) => {
    const body = request.body;

    if (typeof body?.enabled !== "boolean") {
      reply.code(400);
      return { message: "enabled must be a boolean" };
    }

    if (!body.channel || !["in_app", "email", "webhook", "telegram"].includes(body.channel)) {
      reply.code(400);
      return { message: "channel must be one of: in_app, email, webhook, telegram" };
    }

    if (!body.deliveryTime || !/^\d{2}:\d{2}$/.test(body.deliveryTime)) {
      reply.code(400);
      return { message: "deliveryTime must be in HH:MM format" };
    }

    return updateDailySummaryConfig(body);
  });
}
