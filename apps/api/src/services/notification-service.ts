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
    const initialLength = mockNotifications.length;
    const filtered = mockNotifications.filter((item) => {
      if (filter.status && item.status !== filter.status) return false;
      if (filter.channel && item.channel !== filter.channel) return false;
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

  let query = db.deleteFrom("notifications");

  if (filter.status) {
    query = query.where("status", "=", filter.status);
  }

  if (filter.channel) {
    query = query.where("channel", "=", filter.channel);
  }

  const result = await query.executeTakeFirst();

  return { deleted: Number(result?.numDeletedRows ?? 0) };
}

export async function clearUnreadByTheme(
  themeId: string,
): Promise<{ updated: number }> {
  const db = getDatabase();

  if (!db) {
    let updated = 0;
    for (const notification of mockNotifications) {
      if (notification.status === "pending") {
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

    // Simulate retry - in real implementation, this would call the notification channel
    notification.status = "sent";
    notification.sentAt = new Date().toISOString();
    return { success: true };
  }

  const existing = await db
    .selectFrom("notifications")
    .select(["id", "status", "channel"])
    .where("id", "=", notificationId)
    .executeTakeFirst();

  if (!existing) {
    return { success: false, message: "Notification not found" };
  }

  if (existing.status !== "failed") {
    return { success: false, message: "Notification is not in failed state" };
  }

  // In a real implementation, this would:
  // 1. Get the notification details
  // 2. Call the appropriate channel (email, webhook, telegram)
  // 3. Update status based on result

  // For now, we'll just mark it as pending for retry
  await db
    .updateTable("notifications")
    .set({
      status: "pending",
      sent_at: null,
    })
    .where("id", "=", notificationId)
    .execute();

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

    const payload = notification.payload as Record<string, unknown>;
    const result = await sendNotification(
      {
        id: notification.id,
        eventId: notification.eventId,
        channel: notification.channel as NotificationChannel,
        title: (payload.title as string) || "",
        summary: (payload.summary as string) || "",
        signal: (payload.signal as string) || "",
      },
      channelConfig,
    );

    if (result.success) {
      notification.status = "sent";
      notification.sentAt = new Date().toISOString();
    } else {
      notification.status = "failed";
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
      "e.title as title",
      "e.summary as summary",
      "e.signal as signal",
    ])
    .where("n.id", "=", notificationId)
    .executeTakeFirst();

  if (!row) {
    return { success: false, error: "Notification not found" };
  }

  const payload = (row.payload as Record<string, unknown>) || {};

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

  // Update notification status based on result
  if (result.success) {
    await db
      .updateTable("notifications")
      .set({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .where("id", "=", notificationId)
      .execute();
  } else {
    await db
      .updateTable("notifications")
      .set({
        status: "failed",
      })
      .where("id", "=", notificationId)
      .execute();
  }

  return result;
}
