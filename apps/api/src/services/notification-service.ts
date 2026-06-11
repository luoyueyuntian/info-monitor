import type {
  NotificationItem as SharedNotificationItem,
  NotificationStatus as SharedNotificationStatus,
} from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { mockNotifications } from "../lib/mock-store.js";

export const notificationStatuses = ["pending", "sent", "failed"] as const;

export type NotificationStatus = SharedNotificationStatus;

type NotificationListItem = SharedNotificationItem;

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
  options: { limit?: number; status?: NotificationStatus } = {},
): Promise<NotificationListItem[]> {
  const db = getDatabase();
  const limit = options.limit ?? 50;

  if (!db) {
    let items = [...mockNotifications];

    if (options.status) {
      items = items.filter((item) => item.status === options.status);
    }

    return items
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit)
      .map(toNotificationListItem);
  }

  let query = db
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
    .orderBy("n.created_at desc")
    .limit(limit);

  if (options.status) {
    query = query.where("n.status", "=", options.status);
  }

  const rows = await query.execute();

  return rows.map((row) =>
    toNotificationListItem({
      ...row,
      payload: row.payload || {},
      sentAt: row.sentAt,
      createdAt: row.createdAt,
    }),
  );
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
