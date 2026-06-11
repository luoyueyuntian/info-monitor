import type {
  NotificationPreference,
  NotificationPreferenceInput,
} from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";

// Mock preferences for demo mode
const mockPreferences: NotificationPreference[] = [
  {
    id: "pref-default-theme-surface-pro-8-in_app",
    userId: "default",
    themeId: "theme-surface-pro-8",
    sourceId: null,
    signal: null,
    channel: "in_app",
    isEnabled: true,
    isMuted: false,
    priorityOnly: false,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "pref-default-theme-pbc-open-market-in_app",
    userId: "default",
    themeId: "theme-pbc-open-market",
    sourceId: null,
    signal: null,
    channel: "in_app",
    isEnabled: true,
    isMuted: false,
    priorityOnly: false,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "pref-default-signal-30d_low-in_app",
    userId: "default",
    themeId: null,
    sourceId: null,
    signal: "30d_low",
    channel: "in_app",
    isEnabled: true,
    isMuted: false,
    priorityOnly: false,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
];

export async function listNotificationPreferences(
  userId: string = "default",
): Promise<NotificationPreference[]> {
  const db = getDatabase();

  if (!db) {
    return mockPreferences.filter((p) => p.userId === userId);
  }

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
      "created_at as createdAt",
      "updated_at as updatedAt",
    ])
    .where("user_id", "=", userId)
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
  const db = getDatabase();

  if (!db) {
    return mockPreferences.find((p) => p.id === preferenceId) ?? null;
  }

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
  const db = getDatabase();
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
    createdAt: now,
    updatedAt: now,
  };

  if (!db) {
    mockPreferences.push(preference);
    return preference;
  }

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
    })
    .execute();

  return preference;
}

export async function updateNotificationPreference(
  preferenceId: string,
  input: Partial<NotificationPreferenceInput>,
): Promise<NotificationPreference | null> {
  const db = getDatabase();

  if (!db) {
    const index = mockPreferences.findIndex((p) => p.id === preferenceId);
    if (index === -1) return null;

    const existing = mockPreferences[index];
    const updated: NotificationPreference = {
      ...existing,
      themeId: input.themeId !== undefined ? input.themeId : existing.themeId,
      sourceId: input.sourceId !== undefined ? input.sourceId : existing.sourceId,
      signal: input.signal !== undefined ? input.signal : existing.signal,
      channel: input.channel ?? existing.channel,
      isEnabled: input.isEnabled ?? existing.isEnabled,
      isMuted: input.isMuted ?? existing.isMuted,
      priorityOnly: input.priorityOnly ?? existing.priorityOnly,
      updatedAt: new Date().toISOString(),
    };

    mockPreferences[index] = updated;
    return updated;
  }

  const updatePatch: Record<string, unknown> = {};

  if (input.themeId !== undefined) updatePatch.theme_id = input.themeId;
  if (input.sourceId !== undefined) updatePatch.source_id = input.sourceId;
  if (input.signal !== undefined) updatePatch.signal = input.signal;
  if (input.channel !== undefined) updatePatch.channel = input.channel;
  if (input.isEnabled !== undefined) updatePatch.is_enabled = input.isEnabled;
  if (input.isMuted !== undefined) updatePatch.is_muted = input.isMuted;
  if (input.priorityOnly !== undefined) updatePatch.priority_only = input.priorityOnly;
  updatePatch.updated_at = new Date();

  if (Object.keys(updatePatch).length === 0) {
    return getNotificationPreference(preferenceId);
  }

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
  const db = getDatabase();

  if (!db) {
    const index = mockPreferences.findIndex((p) => p.id === preferenceId);
    if (index === -1) return false;

    mockPreferences.splice(index, 1);
    return true;
  }

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
} | null> {
  const db = getDatabase();

  if (!db) {
    // In mock mode, find the most specific matching preference
    const matched = mockPreferences
      .filter((p) => p.userId === userId && p.channel === channel)
      .filter((p) => {
        if (themeId && p.themeId && p.themeId !== themeId) return false;
        if (sourceId && p.sourceId && p.sourceId !== sourceId) return false;
        if (signal && p.signal && p.signal !== signal) return false;
        return true;
      })
      .sort((a, b) => {
        // More specific preferences first
        const aSpecificity = (a.sourceId ? 3 : 0) + (a.themeId ? 2 : 0) + (a.signal ? 1 : 0);
        const bSpecificity = (b.sourceId ? 3 : 0) + (b.themeId ? 2 : 0) + (b.signal ? 1 : 0);
        return bSpecificity - aSpecificity;
      })[0];

    if (!matched) return null;

    return {
      isEnabled: matched.isEnabled,
      isMuted: matched.isMuted,
      priorityOnly: matched.priorityOnly,
    };
  }

  // Query for the most specific matching preference
  let query = db
    .selectFrom("notification_preferences")
    .select([
      "is_enabled as isEnabled",
      "is_muted as isMuted",
      "priority_only as priorityOnly",
      "theme_id as themeId",
      "source_id as sourceId",
      "signal",
    ])
    .where("user_id", "=", userId)
    .where("channel", "=", channel);

  // Build specificity score for ordering
  const specificity = db
    .selectFrom("notification_preferences")
    .select(({ eb, val }) => [
      eb("theme_id", "is not", null).as("has_theme"),
      eb("source_id", "is not", null).as("has_source"),
      eb("signal", "is not", null).as("has_signal"),
    ]);

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
  };
}
