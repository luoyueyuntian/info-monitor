import type {
  NotificationChannel,
  NotificationItem as SharedNotificationItem,
  NotificationStatus as SharedNotificationStatus,
} from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { mockNotifications } from "../lib/mock-store.js";
import {
  type ChannelConfig,
  type NotificationPayload,
  sendNotification,
} from "./notification-channels.js";
import { logAuditEvent } from "./notification-audit-service.js";
import { checkRateLimit, releaseLastSlot } from "./rate-limiter.js";
import { getEffectivePreference } from "./notification-preference-service.js";
import { getEffectiveRuleConfig } from "./rule-config-service.js";

// ─── Retry Configuration ─────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second

/**
 * Calculate the next retry time using exponential backoff with jitter.
 * delay = baseDelay * 2^retryCount + random jitter
 */
function calculateNextRetryDelay(retryCount: number): number {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, retryCount);
  const jitter = Math.random() * BASE_DELAY_MS; // 0-1s jitter
  return exponentialDelay + jitter;
}

export const notificationStatuses = ["pending", "sent", "failed"] as const;

export type NotificationStatus = SharedNotificationStatus;

type NotificationListItem = SharedNotificationItem;

export type PaginatedNotifications = {
  items: NotificationListItem[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
};

export type NotificationFilter = {
  status?: NotificationStatus;
  channel?: string;
  signal?: string;
  themeId?: string;
};

export function isNotificationStatus(value: string): value is NotificationStatus {
  return notificationStatuses.includes(value as NotificationStatus);
}

function toIsoTimestamp(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function toNotificationListItem(row: Record<string, unknown>): NotificationListItem {
  const payload = (row.payload as Record<string, unknown>) || {};

  return {
    id: row.id as string,
    eventId: row.eventId as string,
    channel: row.channel as string,
    status: row.status as string,
    title: (payload.title as string) || (row.title as string) || "",
    summary: (payload.summary as string) || (row.summary as string) || "",
    signal: (payload.signal as string) || (row.signal as string) || "",
    sentAt: toIsoTimestamp(row.sentAt),
    createdAt: toIsoTimestamp(row.createdAt) || new Date().toISOString(),
  };
}

export async function listNotifications(
  options: {
    limit?: number;
    status?: NotificationStatus;
    cursor?: string;
    offset?: number;
    signal?: string;
    themeId?: string;
    onlyUnreadEvents?: boolean;
    sortBy?: "createdAt" | "sentAt";
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<PaginatedNotifications> {
  const db = getDatabase();
  const limit = options.limit ?? 20;
  const sortBy = options.sortBy ?? "createdAt";
  const sortOrder = options.sortOrder ?? "desc";

  if (!db) {
    let items = [...mockNotifications];

    if (options.status) {
      items = items.filter((item) => item.status === options.status);
    }

    if (options.signal) {
      items = items.filter((item) => {
        const payload = item.payload as Record<string, unknown>;
        return payload?.signal === options.signal;
      });
    }

    items = items
      .sort((left, right) => {
        const leftVal = sortBy === "sentAt" ? left.sentAt || left.createdAt : left.createdAt;
        const rightVal = sortBy === "sentAt" ? right.sentAt || right.createdAt : right.createdAt;
        return sortOrder === "desc"
          ? rightVal.localeCompare(leftVal)
          : leftVal.localeCompare(rightVal);
      });

    const offset = options.offset ?? 0;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      items: paginatedItems.map(toNotificationListItem),
      total: items.length,
      hasMore: offset + limit < items.length,
    };
  }

  // Build base query for counting
  let countQuery = db
    .selectFrom("notifications as n")
    .leftJoin("events as e", "e.id", "n.event_id")
    .select(({ fn }) => [fn.count("n.id").as("total")]);

  // Build data query
  let dataQuery = db
    .selectFrom("notifications as n")
    .leftJoin("events as e", "e.id", "n.event_id")
    .leftJoin("themes as t", "t.id", "e.theme_id")
    .select([
      "n.id as id",
      "n.event_id as eventId",
      "n.channel as channel",
      "n.status as status",
      "n.payload as payload",
      "e.title as title",
      "e.summary as summary",
      "e.signal as signal",
      "e.theme_id as themeId",
      "e.status as eventStatus",
      "n.sent_at as sentAt",
      "n.created_at as createdAt",
    ]);

  // Apply filters
  if (options.status) {
    countQuery = countQuery.where("n.status", "=", options.status);
    dataQuery = dataQuery.where("n.status", "=", options.status);
  }

  if (options.signal) {
    countQuery = countQuery.where("e.signal", "=", options.signal);
    dataQuery = dataQuery.where("e.signal", "=", options.signal);
  }

  if (options.themeId) {
    countQuery = countQuery.where("e.theme_id", "=", options.themeId);
    dataQuery = dataQuery.where("e.theme_id", "=", options.themeId);
  }

  if (options.onlyUnreadEvents) {
    countQuery = countQuery.where("e.is_read", "=", false);
    dataQuery = dataQuery.where("e.is_read", "=", false);
  }

  // Apply cursor-based pagination
  if (options.cursor) {
    const cursorDate = new Date(options.cursor);
    const sortColumn = sortBy === "sentAt" ? "n.sent_at" : "n.created_at";
    countQuery = countQuery.where(sortColumn, "<", cursorDate as any);
    dataQuery = dataQuery.where(sortColumn, "<", cursorDate as any);
  }

  // Get total count
  const countResult = await countQuery.executeTakeFirst();
  const total = Number(countResult?.total ?? 0);

  // Apply ordering and limit
  const sortColumn = sortBy === "sentAt" ? "n.sent_at" : "n.created_at";
  dataQuery = dataQuery
    .orderBy(sortColumn, sortOrder)
    .limit(limit);

  // Apply offset if provided (for offset-based pagination)
  if (options.offset !== undefined && !options.cursor) {
    dataQuery = dataQuery.offset(options.offset);
  }

  const rows = await dataQuery.execute();

  const items = rows.map((row) =>
    toNotificationListItem({
      ...row,
      payload: row.payload || {},
      sentAt: row.sentAt,
      createdAt: row.createdAt,
    }),
  );

  const lastItem = items[items.length - 1];
  const hasMore = items.length === limit;

  const nextCursorValue = hasMore
    ? (sortBy === "sentAt" ? lastItem?.sentAt : lastItem?.createdAt)
    : undefined;

  return {
    items,
    total,
    hasMore,
    nextCursor: nextCursorValue ?? undefined,
  };
}

export async function getNotificationDetail(notificationId: string) {
  const db = getDatabase();

  if (!db) {
    const notification = mockNotifications.find((item) => item.id === notificationId);

    if (!notification) {
      return null;
    }

    return toNotificationListItem(notification);
  }

  const row = await db
    .selectFrom("notifications as n")
    .leftJoin("events as e", "e.id", "n.event_id")
    .select([
      "n.id as id",
      "n.event_id as eventId",
      "n.channel as channel",
      "n.status as status",
      "n.payload as payload",
      "e.title as title",
      "e.summary as summary",
      "e.signal as signal",
      "n.sent_at as sentAt",
      "n.created_at as createdAt",
    ])
    .where("n.id", "=", notificationId)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return toNotificationListItem({
    ...row,
    payload: row.payload || {},
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  });
}

export async function markNotificationStatus(
  notificationId: string,
  status: NotificationStatus,
) {
  const db = getDatabase();

  if (!db) {
    const notification = mockNotifications.find((item) => item.id === notificationId);

    if (!notification) {
      return null;
    }

    notification.status = status;
    notification.sentAt = status === "sent" ? new Date().toISOString() : null;

    return {
      id: notificationId,
      status,
    };
  }

  const existing = await db
    .selectFrom("notifications")
    .select(["id", "status"])
    .where("id", "=", notificationId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  const updatePatch: Record<string, unknown> = { status };

  if (status === "sent") {
    updatePatch.sent_at = new Date().toISOString();
  } else {
    updatePatch.sent_at = null;
  }

  await db
    .updateTable("notifications")
    .set(updatePatch)
    .where("id", "=", notificationId)
    .execute();

  return {
    id: notificationId,
    status,
  };
}

export async function batchMarkNotificationsRead(
  notificationIds: string[],
): Promise<{ updated: number }> {
  const db = getDatabase();

  if (!db) {
    let updated = 0;
    for (const id of notificationIds) {
      const notification = mockNotifications.find((item) => item.id === id);
      if (notification && notification.status !== "sent") {
        notification.status = "sent";
        notification.sentAt = new Date().toISOString();
        updated++;
      }
    }
    return { updated };
  }

  if (notificationIds.length === 0) {
    return { updated: 0 };
  }

  const result = await db
    .updateTable("notifications")
    .set({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .where("id", "in", notificationIds)
    .where("status", "!=", "sent")
    .executeTakeFirst();

  return { updated: Number(result?.numUpdatedRows ?? 0) };
}

export async function batchDeleteNotifications(
  filter: NotificationFilter,
): Promise<{ deleted: number }> {
  const db = getDatabase();

  if (!db) {
    const { mockEvents } = await import("../lib/mock-store.js");

    // Build set of event IDs for themeId filter if needed
    const themeEventIds = filter.themeId
      ? new Set(mockEvents.filter((e) => e.themeId === filter.themeId).map((e) => e.id))
      : null;

    const initialLength = mockNotifications.length;
    const filtered = mockNotifications.filter((item) => {
      if (filter.status && item.status !== filter.status) return false;
      if (filter.channel && item.channel !== filter.channel) return false;
      if (filter.signal) {
        const payload = item.payload as Record<string, unknown>;
        if (payload?.signal !== filter.signal) return false;
      }
      if (themeEventIds && !themeEventIds.has(item.eventId)) return false;
      return true;
    });

    // Remove filtered items
    for (const item of filtered) {
      const index = mockNotifications.indexOf(item);
      if (index > -1) {
        mockNotifications.splice(index, 1);
      }
    }

    return { deleted: initialLength - mockNotifications.length };
  }

  // Use a subquery to filter by signal/themeId through events table
  let query = db
    .deleteFrom("notifications")
    .where(
      "id",
      "in",
      db
        .selectFrom("notifications as n")
        .leftJoin("events as e", "e.id", "n.event_id")
        .select("n.id")
        .$if(!!filter.status, (q) => q.where("n.status", "=", filter.status!))
        .$if(!!filter.channel, (q) => q.where("n.channel", "=", filter.channel!))
        .$if(!!filter.signal, (q) => q.where("e.signal", "=", filter.signal!))
        .$if(!!filter.themeId, (q) => q.where("e.theme_id", "=", filter.themeId!)),
    );

  const result = await query.executeTakeFirst();

  return { deleted: Number(result?.numDeletedRows ?? 0) };
}

export async function clearUnreadByTheme(
  themeId: string,
): Promise<{ updated: number }> {
  const db = getDatabase();

  if (!db) {
    // In mock mode, we need to filter by themeId through events
    // Since mockNotifications don't have themeId directly, we need to check mockEvents
    const { mockEvents } = await import("../lib/mock-store.js");
    const themeEventIds = new Set(
      mockEvents.filter((e) => e.themeId === themeId).map((e) => e.id),
    );

    let updated = 0;
    for (const notification of mockNotifications) {
      if (notification.status === "pending" && themeEventIds.has(notification.eventId)) {
        notification.status = "sent";
        notification.sentAt = new Date().toISOString();
        updated++;
      }
    }
    return { updated };
  }

  const result = await db
    .updateTable("notifications")
    .set({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .where("status", "=", "pending")
    .where(
      "event_id",
      "in",
      db
        .selectFrom("events")
        .select("id")
        .where("theme_id", "=", themeId),
    )
    .executeTakeFirst();

  return { updated: Number(result?.numUpdatedRows ?? 0) };
}

export async function retryFailedNotification(
  notificationId: string,
  channelConfig?: ChannelConfig,
): Promise<{ success: boolean; message?: string }> {
  const db = getDatabase();

  if (!db) {
    const notification = mockNotifications.find((item) => item.id === notificationId);

    if (!notification) {
      return { success: false, message: "Notification not found" };
    }

    if (notification.status !== "failed") {
      return { success: false, message: "Notification is not in failed state" };
    }

    // Track retry count in mock
    const retryCount = ((notification as Record<string, unknown>).retryCount as number) || 0;
    const maxRetries = ((notification as Record<string, unknown>).maxRetries as number) || MAX_RETRIES;
    if (retryCount >= maxRetries) {
      return { success: false, message: `Maximum retry attempts (${maxRetries}) exceeded` };
    }

    if (channelConfig) {
      // Simulate immediate retry send (no real external call in mock mode)
      notification.status = "sent";
      notification.sentAt = new Date().toISOString();
      (notification as Record<string, unknown>).retryCount = retryCount + 1;

      await logAuditEvent(notificationId, "retried", "failed", "pending", "system", {
        retryCount: retryCount + 1,
        channel: notification.channel,
      });
      await logAuditEvent(notificationId, "sent", "pending", "sent", "system", {
        channel: notification.channel,
      });

      return { success: true };
    }

    // No channelConfig - queue for later retry (mirrors DB path behavior)
    (notification as Record<string, unknown>).retryCount = retryCount + 1;
    (notification as Record<string, unknown>).mockRetryNextAt =
      new Date(Date.now() + calculateNextRetryDelay(retryCount)).toISOString();

    await logAuditEvent(notificationId, "retried", "failed", "failed", "system", {
      retryCount: retryCount + 1,
      channel: notification.channel,
      scheduled: true,
    });

    return { success: true };
  }

  const existing = await db
    .selectFrom("notifications")
    .select(["id", "status", "channel", "retry_count", "max_retries"])
    .where("id", "=", notificationId)
    .executeTakeFirst();

  if (!existing) {
    return { success: false, message: "Notification not found" };
  }

  if (existing.status !== "failed") {
    return { success: false, message: "Notification is not in failed state" };
  }

  if (existing.retry_count >= (existing.max_retries || MAX_RETRIES)) {
    return { success: false, message: `Maximum retry attempts (${existing.max_retries || MAX_RETRIES}) exceeded` };
  }

  // If channelConfig is provided, attempt to send immediately (consumes rate limit)
  if (channelConfig) {
    // Check rate limit only when actually sending
    const rateLimit = checkRateLimit(existing.channel);
    if (!rateLimit.allowed) {
      return { success: false, message: `Rate limit exceeded for ${existing.channel}. Try again later.` };
    }

    // Get full notification details for sending
    const notifRow = await db
      .selectFrom("notifications as n")
      .leftJoin("events as e", "e.id", "n.event_id")
      .select([
        "n.id as id",
        "n.event_id as eventId",
        "n.channel as channel",
        "n.payload as payload",
        "e.title as title",
        "e.summary as summary",
        "e.signal as signal",
        "e.theme_id as themeId",
      ])
      .where("n.id", "=", notificationId)
      .executeTakeFirst();

    if (notifRow) {
      // Check preference and priority guards before committing to retry
      const payload = (notifRow.payload as Record<string, unknown>) || {};
      const signal = (notifRow.signal as string) || (payload?.signal as string) || "";
      const guardCheck = await checkSendGuards(
        notifRow.channel,
        notifRow.themeId ?? undefined,
        signal,
      );
      if (!guardCheck.allowed) {
        releaseLastSlot(existing.channel);
        return { success: false, message: guardCheck.reason };
      }

      // Guards passed - log retry attempt to audit before sending
      await logAuditEvent(notificationId, "retried", "failed", "pending", "system", {
        retryCount: existing.retry_count + 1,
        channel: existing.channel,
      });

      const sendResult = await sendNotification(
        {
          id: notifRow.id,
          eventId: notifRow.eventId,
          channel: notifRow.channel as NotificationChannel,
          title: (payload.title as string) || notifRow.title || "",
          summary: (payload.summary as string) || notifRow.summary || "",
          signal: (payload.signal as string) || notifRow.signal || "",
        },
        channelConfig,
      );

      if (sendResult.success) {
        // Send succeeded - mark as sent
        await db
          .updateTable("notifications")
          .set({
            status: "sent",
            sent_at: new Date().toISOString(),
            retry_count: existing.retry_count + 1,
            last_retry_at: new Date().toISOString(),
          })
          .where("id", "=", notificationId)
          .execute();

        await logAuditEvent(notificationId, "sent", "pending", "sent", "system", {
          channel: existing.channel,
          retryCount: existing.retry_count + 1,
        });

        return { success: true };
      }

      // Send failed - release rate limit slot and mark as failed with retry tracking
      releaseLastSlot(existing.channel);

      const nextRetryDelay = calculateNextRetryDelay(existing.retry_count);
      await db
        .updateTable("notifications")
        .set({
          status: "failed",
          retry_count: existing.retry_count + 1,
          last_retry_at: new Date().toISOString(),
          next_retry_at: new Date(Date.now() + nextRetryDelay).toISOString(),
        })
        .where("id", "=", notificationId)
        .execute();

      await logAuditEvent(notificationId, "failed", "pending", "failed", "system", {
        channel: existing.channel,
        error: sendResult.error,
        retryCount: existing.retry_count + 1,
      });

      return { success: false, message: `Retry send failed: ${sendResult.error}` };
    }

    // notifRow was null (notification not found in join) - release rate limit slot
    releaseLastSlot(existing.channel);
  }

  // No channelConfig or notification not found for sending - keep status as "failed"
  // but update retry tracking so getDueRetries() can find it later.
  const nextRetryDelay = calculateNextRetryDelay(existing.retry_count);
  const now = new Date().toISOString();
  await db
    .updateTable("notifications")
    .set({
      retry_count: existing.retry_count + 1,
      last_retry_at: now,
      next_retry_at: new Date(Date.now() + nextRetryDelay).toISOString(),
    })
    .where("id", "=", notificationId)
    .execute();

  // Log scheduling only - status remains "failed", not "pending"
  await logAuditEvent(notificationId, "retried", "failed", "failed", "system", {
    retryCount: existing.retry_count + 1,
    channel: existing.channel,
    scheduled: true,
    nextRetryAt: new Date(Date.now() + nextRetryDelay).toISOString(),
  });

  return { success: true };
}

export async function getNotificationStats(): Promise<{
  total: number;
  pending: number;
  sent: number;
  failed: number;
  failureRate: number;
  recentFailures: Array<{
    id: string;
    eventId: string;
    channel: string;
    createdAt: string;
  }>;
}> {
  const db = getDatabase();

  if (!db) {
    const total = mockNotifications.length;
    const pending = mockNotifications.filter((n) => n.status === "pending").length;
    const sent = mockNotifications.filter((n) => n.status === "sent").length;
    const failed = mockNotifications.filter((n) => n.status === "failed").length;

    return {
      total,
      pending,
      sent,
      failed,
      failureRate: total > 0 ? failed / total : 0,
      recentFailures: mockNotifications
        .filter((n) => n.status === "failed")
        .slice(0, 5)
        .map((n) => ({
          id: n.id,
          eventId: n.eventId,
          channel: n.channel,
          createdAt: n.createdAt,
        })),
    };
  }

  // Get counts by status
  const statusCounts = await db
    .selectFrom("notifications")
    .select(["status"])
    .select((eb) => eb.fn.count("id").as("count"))
    .groupBy("status")
    .execute();

  let total = 0;
  let pending = 0;
  let sent = 0;
  let failed = 0;

  for (const row of statusCounts) {
    const count = Number(row.count);
    total += count;

    if (row.status === "pending") pending = count;
    else if (row.status === "sent") sent = count;
    else if (row.status === "failed") failed = count;
  }

  const recentFailures = await db
    .selectFrom("notifications")
    .select([
      "id",
      "event_id as eventId",
      "channel",
      "created_at as createdAt",
    ])
    .where("status", "=", "failed")
    .orderBy("created_at", "desc")
    .limit(5)
    .execute();

  return {
    total,
    pending,
    sent,
    failed,
    failureRate: total > 0 ? failed / total : 0,
    recentFailures: recentFailures.map((row) => ({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    })),
  };
}

// ─── Preference & Rule Config Integration ────────────────────────────────────

/**
 * Check if a notification should be sent based on user preferences.
 * Returns { allowed, reason } - if not allowed, the reason explains why.
 */
export async function shouldSendNotification(
  channel: string,
  themeId?: string,
  signal?: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const preference = await getEffectivePreference(themeId, undefined, signal, channel);

  if (!preference) {
    // No preference configured - allow by default
    return { allowed: true };
  }

  if (!preference.isEnabled) {
    return { allowed: false, reason: `Notifications disabled for ${themeId ? `theme ${themeId}` : signal ? `signal ${signal}` : channel}` };
  }

  if (preference.isMuted) {
    return { allowed: false, reason: `Notifications muted for ${themeId ? `theme ${themeId}` : signal ? `signal ${signal}` : channel}` };
  }

  return { allowed: true };
}

/**
 * Get the effective rule configuration for a given signal and theme.
 * Used to determine notification behavior (e.g., priority level, dedup window).
 */
export async function getNotificationRuleConfig(
  signal: string,
  themeId?: string,
): Promise<Record<string, unknown> | null> {
  // Map signal to rule key
  const signalToRuleKey: Record<string, string> = {
    "30d_low": "price_30d_low",
    "price_breakout": "price_breakout",
    "consecutive_movement": "consecutive_movement",
    "bullish": "financial_direction",
    "bearish": "financial_direction",
    "liquidity_injection": "financial_direction",
    "liquidity_withdrawal": "financial_direction",
    "new_announcement": "news_announcement",
    "content_update": "content_update",
  };

  const ruleKey = signalToRuleKey[signal];
  if (!ruleKey) {
    return null;
  }

  return getEffectiveRuleConfig(ruleKey, themeId);
}

/**
 * Check if a notification should be sent based on rule config's priority_only setting.
 * If `preference` is provided, skips the redundant getEffectivePreference call.
 */
export async function shouldSendByPriority(
  signal: string,
  themeId?: string,
  channel: string = "in_app",
  preference?: { priorityOnly: boolean } | null,
): Promise<{ allowed: boolean; reason?: string }> {
  if (preference === undefined) {
    preference = await getEffectivePreference(themeId, undefined, signal, channel);
  }

  if (!preference?.priorityOnly) {
    return { allowed: true };
  }

  // If priority_only is set, check the rule config for notification level
  const ruleConfig = await getNotificationRuleConfig(signal, themeId);
  const level = ruleConfig?.notificationLevel as string | undefined;

  if (!level || level === "high" || level === "critical") {
    return { allowed: true };
  }

  return { allowed: false, reason: `Priority-only mode: ${signal} has level "${level}", not high/critical` };
}

/**
 * Combined guard: check preferences and priority in a single call.
 * Fetches the effective preference once and reuses it for both checks.
 */
export async function checkSendGuards(
  channel: string,
  themeId?: string,
  signal?: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const preference = await getEffectivePreference(themeId, undefined, signal, channel);

  if (preference) {
    if (!preference.isEnabled) {
      return { allowed: false, reason: `Notifications disabled for ${themeId ? `theme ${themeId}` : signal ? `signal ${signal}` : channel}` };
    }
    if (preference.isMuted) {
      return { allowed: false, reason: `Notifications muted for ${themeId ? `theme ${themeId}` : signal ? `signal ${signal}` : channel}` };
    }
  }

  // Pass the already-fetched preference to avoid redundant query
  return shouldSendByPriority(signal ?? "", themeId, channel, preference);
}

export async function sendExternalNotification(
  notificationId: string,
  channelConfig: ChannelConfig,
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  if (!db) {
    const notification = mockNotifications.find((n) => n.id === notificationId);
    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    // Check rate limit
    const rateLimit = checkRateLimit(notification.channel);
    if (!rateLimit.allowed) {
      return { success: false, error: `Rate limit exceeded for ${notification.channel}` };
    }

    // Get themeId from mock events
    const { mockEvents } = await import("../lib/mock-store.js");
    const event = mockEvents.find((e) => e.id === notification.eventId);
    const themeId = event?.themeId;

    // Check preferences and priority (single preference fetch)
    const notifPayload = notification.payload as Record<string, unknown>;
    const signal = (notifPayload?.signal as string) || "";
    const guardCheck = await checkSendGuards(notification.channel, themeId, signal);
    if (!guardCheck.allowed) {
      releaseLastSlot(notification.channel);
      return { success: false, error: guardCheck.reason };
    }

    const result = await sendNotification(
      {
        id: notification.id,
        eventId: notification.eventId,
        channel: notification.channel as NotificationChannel,
        title: (notifPayload.title as string) || "",
        summary: (notifPayload.summary as string) || "",
        signal: (notifPayload.signal as string) || "",
      },
      channelConfig,
    );

    if (result.success) {
      notification.status = "sent";
      notification.sentAt = new Date().toISOString();
      await logAuditEvent(notificationId, "sent", "pending", "sent", "system", {
        channel: notification.channel,
      });
    } else {
      releaseLastSlot(notification.channel);
      notification.status = "failed";
      // Track retry timing in mock mode for getDueRetries consistency
      const mockRetryCount = ((notification as Record<string, unknown>).retryCount as number) || 0;
      (notification as Record<string, unknown>).retryCount = mockRetryCount + 1;
      (notification as Record<string, unknown>).mockRetryNextAt =
        new Date(Date.now() + calculateNextRetryDelay(mockRetryCount)).toISOString();
      await logAuditEvent(notificationId, "failed", "pending", "failed", "system", {
        channel: notification.channel,
        error: result.error,
      });
    }

    return result;
  }

  // Get notification with event details
  const row = await db
    .selectFrom("notifications as n")
    .leftJoin("events as e", "e.id", "n.event_id")
    .select([
      "n.id as id",
      "n.event_id as eventId",
      "n.channel as channel",
      "n.status as status",
      "n.payload as payload",
      "n.retry_count as retry_count",
      "e.title as title",
      "e.summary as summary",
      "e.signal as signal",
      "e.theme_id as themeId",
    ])
    .where("n.id", "=", notificationId)
    .executeTakeFirst();

  if (!row) {
    return { success: false, error: "Notification not found" };
  }

  // Check rate limit
  const rateLimit = checkRateLimit(row.channel);
  if (!rateLimit.allowed) {
    return { success: false, error: `Rate limit exceeded for ${row.channel}` };
  }

  // Check preferences and priority (single preference fetch)
  const payload = (row.payload as Record<string, unknown>) || {};
  const signal = (row.signal as string) || (payload?.signal as string) || "";
  const guardCheck = await checkSendGuards(row.channel, row.themeId ?? undefined, signal);
  if (!guardCheck.allowed) {
    releaseLastSlot(row.channel);
    return { success: false, error: guardCheck.reason };
  }

  const result = await sendNotification(
    {
      id: row.id,
      eventId: row.eventId,
      channel: row.channel as NotificationChannel,
      title: (payload.title as string) || row.title || "",
      summary: (payload.summary as string) || row.summary || "",
      signal: (payload.signal as string) || row.signal || "",
    },
    channelConfig,
  );

  // Update notification status and log to audit
  if (result.success) {
    await db
      .updateTable("notifications")
      .set({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .where("id", "=", notificationId)
      .execute();

    await logAuditEvent(notificationId, "sent", row.status, "sent", "system", {
      channel: row.channel,
    });
  } else {
    // Release rate limit slot on failure
    releaseLastSlot(row.channel);

    // Get current retry_count for proper backoff calculation
    const currentRetryCount = (row as Record<string, unknown>).retry_count as number ?? 0;
    const nextRetryDelay = calculateNextRetryDelay(currentRetryCount);
    await db
      .updateTable("notifications")
      .set({
        status: "failed",
        retry_count: currentRetryCount + 1,
        last_retry_at: new Date().toISOString(),
        next_retry_at: new Date(Date.now() + nextRetryDelay).toISOString(),
      })
      .where("id", "=", notificationId)
      .execute();

    await logAuditEvent(notificationId, "failed", row.status, "failed", "system", {
      channel: row.channel,
      error: result.error,
    });
  }

  return result;
}

// ─── Due Retries ─────────────────────────────────────────────────────────────

/**
 * Find notifications that are due for automatic retry.
 * These are failed notifications whose next_retry_at has passed.
 */
export async function getDueRetries(): Promise<Array<{ id: string; channel: string }>> {
  const db = getDatabase();

  if (!db) {
    const now = Date.now();
    return mockNotifications
      .filter((n) => {
        const retryCount = ((n as Record<string, unknown>).retryCount as number) || 0;
        const maxRetries = ((n as Record<string, unknown>).maxRetries as number) || MAX_RETRIES;
        if (n.status !== "failed" || retryCount >= maxRetries) return false;
        // Check timing if available (matches DB path's next_retry_at <= now)
        const retryNextAt = (n as Record<string, unknown>).mockRetryNextAt as string | undefined;
        if (retryNextAt && new Date(retryNextAt).getTime() > now) return false;
        return true;
      })
      .map((n) => ({ id: n.id, channel: n.channel }));
  }

  const now = new Date().toISOString();
  const rows = await db
    .selectFrom("notifications")
    .select(["id", "channel"])
    .where("status", "=", "failed")
    .where("next_retry_at", "<=", now as any)
    .whereRef("retry_count", "<", "max_retries")
    .execute();

  return rows;
}
