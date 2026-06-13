import type { DailySummary } from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";

export type DailySummarySnapshot = {
  id: string;
  date: string;
  summary: DailySummary;
  createdAt: string;
};

// In-memory store for mock mode
const mockSummaryHistory: DailySummarySnapshot[] = [];

export async function saveDailySummarySnapshot(summary: DailySummary): Promise<DailySummarySnapshot> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const snapshot: DailySummarySnapshot = {
    id: createId("summary"),
    date: summary.date,
    summary,
    createdAt: now,
  };

  if (!db) {
    // Mock mode - keep in-memory
    mockSummaryHistory.unshift(snapshot);
    if (mockSummaryHistory.length > 30) mockSummaryHistory.length = 30;
    return snapshot;
  }

  // DB mode - persist to dedicated daily_summaries table
  await db
    .insertInto("daily_summaries")
    .values({
      id: snapshot.id,
      date: snapshot.date,
      summary: JSON.stringify(summary),
      created_at: now,
    })
    .execute();

  return snapshot;
}

export async function getSummaryHistory(limit: number = 7): Promise<DailySummarySnapshot[]> {
  const db = getDatabase();

  if (!db) {
    return mockSummaryHistory.slice(0, limit);
  }

  // DB mode - read from daily_summaries table
  const rows = await db
    .selectFrom("daily_summaries")
    .select(["id", "date", "summary", "created_at"])
    .orderBy("created_at", "desc")
    .limit(limit)
    .execute();

  return rows.map((row) => {
    const summary = typeof row.summary === "string" ? JSON.parse(row.summary) : row.summary;
    return {
      id: row.id,
      date: row.date,
      summary: summary as DailySummary,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  });
}

export async function hasSnapshotForToday(date: string): Promise<boolean> {
  const db = getDatabase();

  if (!db) {
    return mockSummaryHistory.some((s) => s.date === date);
  }

  const row = await db
    .selectFrom("daily_summaries")
    .select("id")
    .where("date", "=", date)
    .limit(1)
    .executeTakeFirst();

  return row !== undefined;
}

export async function compareWithYesterday(today: DailySummary): Promise<{
  today: DailySummary;
  yesterday: DailySummary | null;
  delta: { totalEvents: number; recentEvents: number; newWarningSources: number } | null;
}> {
  const history = await getSummaryHistory(2);
  const yesterday = history.length > 1 ? history[1].summary : null;

  if (!yesterday) {
    return { today, yesterday: null, delta: null };
  }

  return {
    today,
    yesterday,
    delta: {
      totalEvents: today.totalEvents - yesterday.totalEvents,
      recentEvents: today.recentEvents - yesterday.recentEvents,
      newWarningSources: today.warningSources.length - yesterday.warningSources.length,
    },
  };
}
