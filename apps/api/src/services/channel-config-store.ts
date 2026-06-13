/**
 * Channel configuration persistence.
 *
 * Stores webhook/telegram/etc channel credentials so the scheduler
 * can load them when delivering daily summaries or retries.
 *
 * Uses the notification_preferences table with a special signal prefix
 * "channel_config:<channel>" and stores the serialized config JSON in
 * a dedicated id pattern. The signal field is kept stable so DELETE
 * can always find the row.
 */

import type { ChannelConfig } from "./notification-channels.js";
import { getDatabase } from "../db/client.js";

// Mock store for channel configs
const mockChannelConfigs = new Map<string, ChannelConfig>();

const SIGNAL_PREFIX = "channel_config:";
const ID_PREFIX = "channel_config_";

function configId(channel: string): string {
  return `${ID_PREFIX}${channel}`;
}

function configSignal(channel: string): string {
  return `${SIGNAL_PREFIX}${channel}`;
}

function encodeConfig(config: ChannelConfig): string {
  return JSON.stringify(config);
}

function decodeConfig(encoded: string): ChannelConfig | null {
  try {
    return JSON.parse(encoded) as ChannelConfig;
  } catch {
    return null;
  }
}

/**
 * Save channel configuration for a given channel key.
 * Overwrites any existing config for that channel.
 */
export async function saveChannelConfig(
  channel: string,
  config: ChannelConfig,
): Promise<void> {
  const db = getDatabase();

  if (!db) {
    mockChannelConfigs.set(channel, config);
    return;
  }

  const now = new Date().toISOString();
  const id = configId(channel);
  const signal = configSignal(channel);
  const encoded = encodeConfig(config);

  // Delete existing row (signal is stable, so this always matches)
  await db
    .deleteFrom("notification_preferences")
    .where("id", "=", id)
    .execute();

  // Insert fresh row with config encoded in a stable signal field
  await db
    .insertInto("notification_preferences")
    .values({
      id,
      user_id: "default",
      theme_id: null,
      source_id: null,
      signal: `${signal}:${encoded}`,
      channel: channel,
      is_enabled: true,
      is_muted: false,
      priority_only: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      max_per_hour: null,
      created_at: now,
      updated_at: now,
    })
    .execute();
}

/**
 * Load channel configuration for a given channel key.
 * Returns null if no config is saved.
 */
export async function loadChannelConfig(
  channel: string,
): Promise<ChannelConfig | null> {
  const db = getDatabase();

  if (!db) {
    return mockChannelConfigs.get(channel) ?? null;
  }

  const row = await db
    .selectFrom("notification_preferences")
    .select(["signal"])
    .where("id", "=", configId(channel))
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  // Parse config from signal: "channel_config:<channel>:<json>"
  const signal = row.signal ?? "";
  const prefix = `${configSignal(channel)}:`;
  if (!signal.startsWith(prefix)) {
    return null;
  }

  return decodeConfig(signal.slice(prefix.length));
}

/**
 * Load all saved channel configs.
 */
export async function loadAllChannelConfigs(): Promise<Record<string, ChannelConfig>> {
  const db = getDatabase();

  if (!db) {
    const result: Record<string, ChannelConfig> = {};
    for (const [key, value] of mockChannelConfigs) {
      result[key] = value;
    }
    return result;
  }

  const rows = await db
    .selectFrom("notification_preferences")
    .select(["signal"])
    .where("signal", "like", `${SIGNAL_PREFIX}%`)
    .execute();

  const result: Record<string, ChannelConfig> = {};
  for (const row of rows) {
    const signal = row.signal ?? "";
    // "channel_config:<channel>:<json>"
    const afterPrefix = signal.slice(SIGNAL_PREFIX.length);
    const colonIdx = afterPrefix.indexOf(":");
    if (colonIdx === -1) continue;
    const channel = afterPrefix.slice(0, colonIdx);
    const config = decodeConfig(afterPrefix.slice(colonIdx + 1));
    if (config) {
      result[channel] = config;
    }
  }

  return result;
}

/**
 * Check if a signal string belongs to a channel config entry.
 */
export function isChannelConfigSignal(signal: string | null): boolean {
  return signal?.startsWith(SIGNAL_PREFIX) ?? false;
}

/**
 * Check if a preference id belongs to a channel config entry.
 */
export function isChannelConfigId(id: string): boolean {
  return id.startsWith(ID_PREFIX);
}
