import type {
  NotificationPreference,
  NotificationPreferenceInput,
} from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";

/**
 * Check if a signal string belongs to a system-internal preference
 * that should not be exposed in the user-facing preferences list.
 */
function isSystemPreference(signal: string | null | undefined): boolean {
  if (!signal) return false;
  return signal.startsWith("channel_config:") || signal.startsWith("daily_summary:");
}

function requireDatabase() {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  return db;
}

export async function listNotificationPreferences(
  userId: string = "default",
): Promise<NotificationPreference[]> {
  const db = requireDatabase();

  const rows = await db
    .selectFrom("notification_preferences")
    .select([
      "id",
      "user_id as userId",
      "theme_id as themeId",
      "source_id as sourceId",
      "signal",
      "channel",
      "is_enabled as isEnabled",
      "is_muted as isMuted",
      "priority_only as priorityOnly",
      "quiet_hours_start as quietHoursStart",
      "quiet_hours_end as quietHoursEnd",
      "max_per_hour as maxPerHour",
      "created_at as createdAt",
      "updated_at as updatedAt",
    ])
    .where("user_id", "=", userId)
    .where((eb) =>
      eb.or([
        eb("signal", "is", null),
        eb.and([
          eb("signal", "not like", "channel_config:%"),
          eb("signal", "not like", "daily_summary:%"),
        ]),
      ]),
    )
    .orderBy("created_at", "desc")
    .execute();

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }));
}

export async function getNotificationPreference(
  preferenceId: string,
): Promise<NotificationPreference | null> {
  const db = requireDatabase();

  const row = await db
    .selectFrom("notification_preferences")
    .select([
      "id",
      "user_id as userId",
      "theme_id as themeId",
      "source_id as sourceId",
      "signal",
      "channel",
      "is_enabled as isEnabled",
      "is_muted as isMuted",
      "priority_only as priorityOnly",
      "quiet_hours_start as quietHoursStart",
      "quiet_hours_end as quietHoursEnd",
      "max_per_hour as maxPerHour",
      "created_at as createdAt",
      "updated_at as updatedAt",
    ])
    .where("id", "=", preferenceId)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export async function createNotificationPreference(
  input: NotificationPreferenceInput,
  userId: string = "default",
): Promise<NotificationPreference> {
  const db = requireDatabase();
  const now = new Date().toISOString();
  const id = createId("notification_preferences");

  const preference: NotificationPreference = {
    id,
    userId,
    themeId: input.themeId ?? null,
    sourceId: input.sourceId ?? null,
    signal: input.signal ?? null,
    channel: input.channel ?? "in_app",
    isEnabled: input.isEnabled ?? true,
    isMuted: input.isMuted ?? false,
    priorityOnly: input.priorityOnly ?? false,
    quietHoursStart: input.quietHoursStart ?? null,
    quietHoursEnd: input.quietHoursEnd ?? null,
    maxPerHour: input.maxPerHour ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .insertInto("notification_preferences")
    .values({
      id,
      user_id: userId,
      theme_id: input.themeId ?? null,
      source_id: input.sourceId ?? null,
      signal: input.signal ?? null,
      channel: input.channel ?? "in_app",
      is_enabled: input.isEnabled ?? true,
      is_muted: input.isMuted ?? false,
      priority_only: input.priorityOnly ?? false,
      quiet_hours_start: input.quietHoursStart ?? null,
      quiet_hours_end: input.quietHoursEnd ?? null,
      max_per_hour: input.maxPerHour ?? null,
    })
    .execute();

  return preference;
}

export async function updateNotificationPreference(
  preferenceId: string,
  input: Partial<NotificationPreferenceInput>,
): Promise<NotificationPreference | null> {
  const db = requireDatabase();

  const updatePatch: Record<string, unknown> = {};

  if (input.themeId !== undefined) updatePatch.theme_id = input.themeId;
  if (input.sourceId !== undefined) updatePatch.source_id = input.sourceId;
  if (input.signal !== undefined) updatePatch.signal = input.signal;
  if (input.channel !== undefined) updatePatch.channel = input.channel;
  if (input.isEnabled !== undefined) updatePatch.is_enabled = input.isEnabled;
  if (input.isMuted !== undefined) updatePatch.is_muted = input.isMuted;
  if (input.priorityOnly !== undefined) updatePatch.priority_only = input.priorityOnly;
  if (input.quietHoursStart !== undefined) updatePatch.quiet_hours_start = input.quietHoursStart;
  if (input.quietHoursEnd !== undefined) updatePatch.quiet_hours_end = input.quietHoursEnd;
  if (input.maxPerHour !== undefined) updatePatch.max_per_hour = input.maxPerHour;

  if (Object.keys(updatePatch).length === 0) {
    return getNotificationPreference(preferenceId);
  }

  updatePatch.updated_at = new Date();

  await db
    .updateTable("notification_preferences")
    .set(updatePatch)
    .where("id", "=", preferenceId)
    .execute();

  return getNotificationPreference(preferenceId);
}

export async function deleteNotificationPreference(
  preferenceId: string,
): Promise<boolean> {
  const db = requireDatabase();

  const result = await db
    .deleteFrom("notification_preferences")
    .where("id", "=", preferenceId)
    .executeTakeFirst();

  return Number(result?.numDeletedRows ?? 0) > 0;
}

export async function getEffectivePreference(
  themeId?: string,
  sourceId?: string,
  signal?: string,
  channel: string = "in_app",
  userId: string = "default",
): Promise<{
  isEnabled: boolean;
  isMuted: boolean;
  priorityOnly: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  maxPerHour: number | null;
} | null> {
  const db = requireDatabase();

  // Query for the most specific matching preference
  let query = db
    .selectFrom("notification_preferences")
    .select([
      "is_enabled as isEnabled",
      "is_muted as isMuted",
      "priority_only as priorityOnly",
      "quiet_hours_start as quietHoursStart",
      "quiet_hours_end as quietHoursEnd",
      "max_per_hour as maxPerHour",
      "theme_id as themeId",
      "source_id as sourceId",
      "signal",
    ])
    .where("user_id", "=", userId)
    .where("channel", "=", channel);

  const rows = await query.execute();

  // Sort by specificity in application code
  const sorted = rows
    .map((row) => ({
      ...row,
      specificity:
        (row.sourceId ? 3 : 0) + (row.themeId ? 2 : 0) + (row.signal ? 1 : 0),
    }))
    .filter((row) => {
      if (themeId && row.themeId && row.themeId !== themeId) return false;
      if (sourceId && row.sourceId && row.sourceId !== sourceId) return false;
      if (signal && row.signal && row.signal !== signal) return false;
      return true;
    })
    .sort((a, b) => b.specificity - a.specificity);

  const matched = sorted[0];
  if (!matched) return null;

  return {
    isEnabled: matched.isEnabled,
    isMuted: matched.isMuted,
    priorityOnly: matched.priorityOnly,
    quietHoursStart: matched.quietHoursStart ?? null,
    quietHoursEnd: matched.quietHoursEnd ?? null,
    maxPerHour: matched.maxPerHour ?? null,
  };
}

/**
 * Check if the current time is within a quiet hours window.
 * quietHoursStart/End are in "HH:MM" format (24h, Asia/Shanghai timezone).
 */
export function isInQuietHours(
  quietHoursStart: string | null | undefined,
  quietHoursEnd: string | null | undefined,
): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false;

  const now = new Date();
  const cstTime = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const [currentH, currentM] = cstTime.split(":").map(Number);
  const [startH, startM] = quietHoursStart.split(":").map(Number);
  const [endH, endM] = quietHoursEnd.split(":").map(Number);

  const currentMinutes = currentH * 60 + currentM;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

// In-memory frequency tracking
const frequencyCounters = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
let lastEviction = Date.now();

/**
 * Evict expired entries from the frequency counter map.
 * Runs at most once per minute to avoid overhead.
 */
function evictExpiredCounters(): void {
  const now = Date.now();
  if (now - lastEviction < 60_000) return;
  lastEviction = now;

  for (const [key, entry] of frequencyCounters) {
    if (now - entry.windowStart > WINDOW_MS) {
      frequencyCounters.delete(key);
    }
  }
}

/**
 * Check if a notification exceeds the frequency limit.
 * Returns { allowed: true } or { allowed: false, reason: "..." }.
 */
export function checkFrequencyGuard(
  key: string,
  maxPerHour: number | null | undefined,
): { allowed: boolean; reason?: string } {
  if (!maxPerHour || maxPerHour <= 0) return { allowed: true };

  evictExpiredCounters();

  const now = Date.now();
  const entry = frequencyCounters.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    frequencyCounters.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= maxPerHour) {
    return {
      allowed: false,
      reason: `Frequency limit reached: max ${maxPerHour} per hour for ${key}`,
    };
  }

  entry.count += 1;
  return { allowed: true };
}
