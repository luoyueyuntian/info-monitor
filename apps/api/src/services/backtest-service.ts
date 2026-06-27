import { getDatabase } from "../db/client.js";

export type HypotheticalEvent = {
  event_type: string;
  signal: string;
  title: string;
  summary: string;
  occurred_at: string;
  evidence: string[];
};

export type BacktestResult = {
  sourceId: string;
  themeId: string;
  startDate: string;
  endDate: string;
  totalRecords: number;
  hypotheticalEvents: HypotheticalEvent[];
  signalDistribution: Record<string, number>;
  timeline: Array<{
    recordId: string;
    occurredAt: string;
    title: string;
    eventCount: number;
    signals: string[];
  }>;
};

// Mock fallback for when DB is not available
async function backtestMock(
  sourceId: string,
  startDate: string,
  endDate: string,
): Promise<BacktestResult> {
  return {
    sourceId,
    themeId: "mock-theme",
    startDate,
    endDate,
    totalRecords: 5,
    hypotheticalEvents: [
      {
        event_type: "price_low",
        signal: "30d_low",
        title: "Price near 30-day low",
        summary: "Current price is near the 30-day low, potential buying opportunity",
        occurred_at: "2026-06-20T09:30:00+08:00",
        evidence: ["Price: 1728.52", "30d low: 1710.00"],
      },
      {
        event_type: "rsi_signal",
        signal: "oversold",
        title: "RSI oversold signal",
        summary: "RSI(14) = 28.5, below oversold threshold of 30",
        occurred_at: "2026-06-22T14:00:00+08:00",
        evidence: ["RSI(14): 28.5", "Threshold: 30"],
      },
    ],
    signalDistribution: { "30d_low": 1, oversold: 1 },
    timeline: [
      { recordId: "rec-1", occurredAt: "2026-06-18T09:30:00+08:00", title: "Price: 1750.00", eventCount: 0, signals: [] },
      { recordId: "rec-2", occurredAt: "2026-06-19T09:30:00+08:00", title: "Price: 1735.00", eventCount: 0, signals: [] },
      { recordId: "rec-3", occurredAt: "2026-06-20T09:30:00+08:00", title: "Price: 1728.52", eventCount: 1, signals: ["30d_low"] },
      { recordId: "rec-4", occurredAt: "2026-06-21T09:30:00+08:00", title: "Price: 1720.00", eventCount: 0, signals: [] },
      { recordId: "rec-5", occurredAt: "2026-06-22T14:00:00+08:00", title: "Price: 1715.00", eventCount: 1, signals: ["oversold"] },
    ],
  };
}

export async function runBacktest(
  sourceId: string,
  startDate: string,
  endDate: string,
  _detectorConfig?: Record<string, unknown>,
): Promise<BacktestResult> {
  const db = getDatabase();
  if (!db) return backtestMock(sourceId, startDate, endDate);

  // In DB mode, fetch records and run backtest logic
  const records = await db
    .selectFrom("normalized_records")
    .select(["id", "title", "occurred_at", "content", "info_type"])
    .where("source_id", "=", sourceId)
    .where("occurred_at", ">=", new Date(startDate))
    .where("occurred_at", "<=", new Date(endDate))
    .orderBy("occurred_at", "asc")
    .execute();

  // Get source and theme info
  const source = await db
    .selectFrom("sources")
    .select(["id", "theme_id", "name"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  const themeId = source?.theme_id ?? "";

  // Simple event simulation based on info_type
  const hypotheticalEvents: HypotheticalEvent[] = [];
  const signalDistribution: Record<string, number> = {};
  const timeline: BacktestResult["timeline"] = [];

  for (const record of records) {
    const content = typeof record.content === "string"
      ? JSON.parse(record.content)
      : (record.content as Record<string, unknown>) ?? {};

    const events: HypotheticalEvent[] = [];
    const occurredAt = record.occurred_at instanceof Date
      ? record.occurred_at.toISOString()
      : String(record.occurred_at);

    if (record.info_type === "price") {
      const price = content.price;
      if (price) {
        events.push({
          event_type: "price_observed",
          signal: "price_update",
          title: `Price: ${price}`,
          summary: `Price recorded at ${price} ${content.currency ?? ""}`,
          occurred_at: occurredAt,
          evidence: [`Price: ${price}`],
        });
      }
    } else {
      events.push({
        event_type: "new_observation",
        signal: record.info_type === "financial_event" ? "new_financial_event" : "new_announcement",
        title: record.title,
        summary: `Observation recorded for ${record.info_type}`,
        occurred_at: occurredAt,
        evidence: [`Title: ${record.title}`],
      });
    }

    for (const evt of events) {
      hypotheticalEvents.push(evt);
      signalDistribution[evt.signal] = (signalDistribution[evt.signal] ?? 0) + 1;
    }

    timeline.push({
      recordId: record.id,
      occurredAt,
      title: record.title,
      eventCount: events.length,
      signals: events.map((e) => e.signal),
    });
  }

  return {
    sourceId,
    themeId,
    startDate,
    endDate,
    totalRecords: records.length,
    hypotheticalEvents,
    signalDistribution,
    timeline,
  };
}
