import { sql } from "kysely";
import type { EventPage, EventPageQuery, EventSummary } from "@info-monitor/shared-contracts";
import { getDatabase } from "../db/client.js";

const invalid = (message: string) => Object.assign(new Error(message), { statusCode: 400 });
const positive = ["30d_low", "bullish", "liquidity_injection"];
const negative = ["bearish", "liquidity_withdrawal"];

function eventQuery() {
  return getDatabase().selectFrom("events as e")
    .innerJoin("themes as t", "t.id", "e.theme_id")
    .leftJoin("changes as c", "c.id", "e.change_id")
    .leftJoin("normalized_records as nr", "nr.id", "c.normalized_record_id")
    .leftJoinLateral((eb) => eb.selectFrom("event_status_history as history")
      .select("changed_at").whereRef("history.event_id", "=", "e.id")
      .orderBy("changed_at", "desc").limit(1).as("h"), (join) => join.onTrue());
}

const columns = ["e.id as id", "e.theme_id as themeId", "t.name as themeName", "e.title as title",
  "e.signal as signal", "e.status as status", "e.is_read as isRead", "e.is_bookmarked as isBookmarked",
  "e.bookmarked_at as bookmarkedAt", "e.event_type as eventType", "e.occurred_at as occurredAt",
  "e.summary as summary", "nr.info_type as infoType", "h.changed_at as latestStatusChangedAt"] as const;

function toIso(value: unknown): string | null {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}
function mapEvent(row: Record<string, unknown>): EventSummary {
  return { ...row, occurredAt: toIso(row.occurredAt)!, bookmarkedAt: toIso(row.bookmarkedAt),
    latestStatusChangedAt: toIso(row.latestStatusChangedAt) } as EventSummary;
}

export async function listCompactEvents(): Promise<EventSummary[]> {
  const rows = await eventQuery().select(columns)
    .select(sql<Record<string, unknown> | null>`case when nr.content is null then null else
      jsonb_strip_nulls(jsonb_build_object('object_name', nr.content->'object_name',
      'update_type', nr.content->'update_type', 'publisher', nr.content->'publisher')) end`.as("context"))
    .orderBy("e.occurred_at", "desc").orderBy("e.id", "desc").execute();
  return rows.map(mapEvent);
}

export async function listEventPage(input: EventPageQuery = {}): Promise<EventPage> {
  const limit = input.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw invalid("Invalid page limit");
  const sort = input.sort ?? "occurredAt";
  if (!["occurredAt", "bookmarkedAt", "statusChanged"].includes(sort)) throw invalid("Invalid sort");
  const sortAt = sort === "bookmarkedAt" ? sql<Date>`coalesce(e.bookmarked_at, 'epoch'::timestamptz)`
    : sort === "statusChanged" ? sql<Date>`coalesce(h.changed_at, 'epoch'::timestamptz)` : sql<Date>`e.occurred_at`;
  let query = eventQuery();
  if (input.q) {
    const search = `%${input.q.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`;
    query = query.where((eb) => eb.or([eb("e.title", "ilike", search), eb("t.name", "ilike", search)]));
  }
  if (input.themeId && input.themeId !== "all") query = query.where("e.theme_id", "in", input.themeId.split(",").map((id) => id.trim()).filter(Boolean));
  if (input.status && input.status !== "all") query = query.where("e.status", "=", input.status);
  if (input.type && input.type !== "all") query = query.where("nr.info_type", "=", input.type);
  if (input.impact === "positive") query = query.where("e.signal", "in", positive);
  if (input.impact === "negative") query = query.where("e.signal", "in", negative);
  if (input.impact === "neutral") query = query.where("e.signal", "not in", [...positive, ...negative]);
  if (input.read === "read") query = query.where("e.is_read", "=", true);
  if (input.read === "unread") query = query.where(sql<boolean>`coalesce(e.is_read, false) = false`);
  if (input.bookmark === "bookmarked") query = query.where("e.is_bookmarked", "=", true);
  if (input.recent === "24h") query = query.where("e.occurred_at", ">=", new Date(Date.now() - 86400_000));
  if (input.since) {
    if (!Number.isFinite(Date.parse(input.since))) throw invalid("Invalid since timestamp");
    query = query.where(sql<boolean>`greatest(e.occurred_at, coalesce(h.changed_at, 'epoch'::timestamptz)) >= ${input.since}::timestamptz`);
  }
  // Total is computed before the cursor so it remains the full matching count.
  const totalQuery = query.select((eb) => eb.fn.countAll().as("total"));
  if (input.cursor) {
    try {
      const cursor = JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8"));
      if (cursor.sort !== sort || typeof cursor.id !== "string" || !cursor.id || typeof cursor.at !== "string"
        || !/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(cursor.at)
        || !Number.isFinite(Date.parse(cursor.at))
        || new Date(cursor.at).toISOString() !== cursor.at.replace(/(\.\d{3})\d{3}Z$/, "$1Z")) throw new Error();
      query = query.where(sql<boolean>`(${sortAt}, e.id) < (${cursor.at}::timestamptz, ${cursor.id})`);
    } catch { throw invalid("Invalid cursor for this sort"); }
  }
  const [count, rows] = await Promise.all([
    totalQuery.executeTakeFirstOrThrow(),
    query.leftJoin("event_feedback as feedback", "feedback.event_id", "e.id").select(columns)
      .select("feedback.feedback as feedback")
      .select(sql<string>`to_char(${sortAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`.as("cursorTime"))
      .orderBy(sortAt, "desc").orderBy("e.id", "desc").limit(limit + 1).execute(),
  ]);
  const visible = rows.slice(0, limit);
  const last = visible.at(-1);
  return {
    items: visible.map(({ cursorTime: _cursorTime, ...row }) => mapEvent(row)),
    total: Number(count.total),
    nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify({ at: last.cursorTime, id: last.id, sort })).toString("base64url") : null,
  };
}

export async function countEventSections() {
  const since = new Date(Date.now() - 86400_000);
  const row = await getDatabase().selectFrom("events as e")
    .leftJoin("changes as c", "c.id", "e.change_id")
    .leftJoin("normalized_records as nr", "nr.id", "c.normalized_record_id")
    .select([
      sql<string>`count(*) filter (where nr.info_type = 'price')`.as("price"),
      sql<string>`count(*) filter (where nr.info_type = 'price' and e.occurred_at >= ${since})`.as("priceRecent"),
      sql<string>`count(*) filter (where nr.info_type = 'content_update')`.as("content"),
      sql<string>`count(*) filter (where nr.info_type = 'content_update' and e.occurred_at >= ${since})`.as("contentRecent"),
      sql<string>`count(*) filter (where e.signal = 'new_announcement')`.as("official"),
      sql<string>`count(*) filter (where e.signal = 'new_announcement' and e.occurred_at >= ${since})`.as("officialRecent"),
      sql<string>`count(*) filter (where nr.info_type = 'financial_event')`.as("financial"),
      sql<string>`count(*) filter (where nr.info_type = 'financial_event' and e.occurred_at >= ${since})`.as("financialRecent"),
    ]).executeTakeFirstOrThrow();
  return {
    "price-signals": { total: Number(row.price), recent: Number(row.priceRecent) },
    "content-updates": { total: Number(row.content), recent: Number(row.contentRecent) },
    "official-releases": { total: Number(row.official), recent: Number(row.officialRecent) },
    "financial-events": { total: Number(row.financial), recent: Number(row.financialRecent) },
  };
}
