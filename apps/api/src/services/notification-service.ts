import type {
  NotificationItem as SharedNotificationItem,
  NotificationStatus as SharedNotificationStatus,
} from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { mockNotifications } from "../lib/mock-store.js";

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
  } = {},
): Promise<PaginatedNotifications> {
  const db = getDatabase();
  const limit = options.limit ?? 20;

  if (!db) {
    let items = [...mockNotifications];

    if (options.status) {
      items = items.filter((item) => item.status === options.status);
    }

    items = items
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

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
    ]);

  // Apply filters
  if (options.status) {
    countQuery = countQuery.where("n.status", "=", options.status);
    dataQuery = dataQuery.where("n.status", "=", options.status);
  }

  // Apply cursor-based pagination
  if (options.cursor) {
    const cursorDate = new Date(options.cursor);
    countQuery = countQuery.where("n.created_at", "<", cursorDate as any);
    dataQuery = dataQuery.where("n.created_at", "<", cursorDate as any);
  }

  // Get total count
  const countResult = await countQuery.executeTakeFirst();
  const total = Number(countResult?.total ?? 0);

  // Apply ordering and limit
  dataQuery = dataQuery
    .orderBy("n.created_at desc")
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

  return {
    items,
    total,
    hasMore,
    nextCursor: hasMore ? lastItem?.createdAt : undefined,
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
