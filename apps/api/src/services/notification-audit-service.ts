/**
 * Notification audit log service.
 *
 * Tracks all state changes for notifications for auditing purposes.
 */

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";

export type AuditAction = "created" | "sent" | "failed" | "read" | "retried" | "deleted";

export type AuditLogEntry = {
  id: string;
  notificationId: string;
  action: AuditAction;
  fromStatus: string | null;
  toStatus: string | null;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function requireDatabase() {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  return db;
}

export async function logAuditEvent(
  notificationId: string,
  action: AuditAction,
  fromStatus: string | null,
  toStatus: string | null,
  actor: string = "system",
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const db = requireDatabase();
  const id = createId("notification_audit_log");
  const now = new Date().toISOString();

  await db
    .insertInto("notification_audit_log")
    .values({
      id,
      notification_id: notificationId,
      action,
      from_status: fromStatus,
      to_status: toStatus,
      actor,
      metadata: JSON.stringify(metadata),
    })
    .execute();
}

export async function getAuditLogs(
  options: {
    notificationId?: string;
    action?: AuditAction;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ items: AuditLogEntry[]; total: number }> {
  const db = requireDatabase();
  const limit = options.limit ?? 50;

  // Build count query
  let countQuery = db
    .selectFrom("notification_audit_log")
    .select((eb) => eb.fn.count("id").as("total"));

  // Build data query
  let dataQuery = db
    .selectFrom("notification_audit_log")
    .select([
      "id",
      "notification_id as notificationId",
      "action",
      "from_status as fromStatus",
      "to_status as toStatus",
      "actor",
      "metadata",
      "created_at as createdAt",
    ]);

  // Apply filters
  if (options.notificationId) {
    countQuery = countQuery.where("notification_id", "=", options.notificationId);
    dataQuery = dataQuery.where("notification_id", "=", options.notificationId);
  }

  if (options.action) {
    countQuery = countQuery.where("action", "=", options.action);
    dataQuery = dataQuery.where("action", "=", options.action);
  }

  // Get total count
  const countResult = await countQuery.executeTakeFirst();
  const total = Number(countResult?.total ?? 0);

  // Get paginated results
  const rows = await dataQuery
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset(options.offset ?? 0)
    .execute();

  return {
    items: rows.map((row) => ({
      ...row,
      action: row.action as AuditAction,
      metadata: (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata) as Record<string, unknown>,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    })),
    total,
  };
}

export async function getNotificationTimeline(
  notificationId: string,
): Promise<AuditLogEntry[]> {
  const db = requireDatabase();

  const rows = await db
    .selectFrom("notification_audit_log")
    .select([
      "id",
      "notification_id as notificationId",
      "action",
      "from_status as fromStatus",
      "to_status as toStatus",
      "actor",
      "metadata",
      "created_at as createdAt",
    ])
    .where("notification_id", "=", notificationId)
    .orderBy("created_at", "asc")
    .execute();

  return rows.map((row) => ({
    ...row,
    action: row.action as AuditAction,
    metadata: (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata) as Record<string, unknown>,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }));
}
