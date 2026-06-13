import type { DailySummary, DailySummaryItem, EventSummary, NotificationChannel } from "@info-monitor/shared-contracts";

import { sql } from "kysely";
import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";
import { mockEvents, mockSources, mockThemes } from "../lib/mock-store.js";
import {
  sendNotification,
  type ChannelConfig,
  type NotificationPayload,
} from "./notification-channels.js";
import { saveDailySummarySnapshot, hasSnapshotForToday } from "./daily-summary-history.js";

export type { DailySummary, DailySummaryItem };

function formatSummaryForDelivery(summary: DailySummary): { title: string; body: string } {
  const activeCategories = summary.items.filter((item) => item.recentCount > 0);
  const title = `Daily Summary — ${summary.date}`;
  const lines: string[] = [];

  lines.push(`${summary.recentEvents} events in last 24h (${summary.totalEvents} total)`);

  for (const item of activeCategories) {
    lines.push(`• ${item.label}: +${item.recentCount} today`);
    if (item.latestEvent) {
      lines.push(`  Latest: ${item.latestEvent.title}`);
    }
  }

  if (summary.warningSources.length > 0) {
    lines.push(`⚠ ${summary.warningSources.length} warning source(s)`);
  }

  return { title, body: lines.join("\n") };
}

export async function deliverDailySummary(
  channel: NotificationChannel = "in_app",
  channelConfig?: ChannelConfig,
): Promise<{ delivered: boolean; notificationId?: string; error?: string }> {
  const summary = await getDailySummary();
  const { title, body } = formatSummaryForDelivery(summary);
  const db = getDatabase();
  const notificationId = createId("notification");
  const now = new Date().toISOString();

  // For external channels, actually send via the channel system
  if (channel !== "in_app") {
    if (!channelConfig) {
      return { delivered: false, error: `channelConfig required for ${channel} delivery` };
    }

    const payload: NotificationPayload = {
      id: notificationId,
      eventId: "",
      channel,
      title,
      summary: body,
      signal: "daily_summary",
    };

    const result = await sendNotification(payload, channelConfig);
    if (!result.success) {
      return { delivered: false, error: result.error };
    }

    // Also persist to notifications table for record-keeping
    if (db) {
      await db
        .insertInto("notifications")
        .values({
          id: notificationId,
          event_id: null,
          channel,
          status: "sent",
          payload: JSON.stringify({ title, summary: body, signal: "daily_summary" }),
          sent_at: now,
          created_at: now,
          retry_count: 0,
          max_retries: 0,
        })
        .execute();
    }

    // Save snapshot for history
    await saveSnapshotIfNeeded(summary);

    return { delivered: true, notificationId };
  }

  // In-app: persist to notifications table
  if (db) {
    await db
      .insertInto("notifications")
      .values({
        id: notificationId,
        event_id: null,
        channel,
        status: "sent",
        payload: JSON.stringify({ title, summary: body, signal: "daily_summary" }),
        sent_at: now,
        created_at: now,
        retry_count: 0,
        max_retries: 0,
      })
      .execute();
  }

  // Save snapshot for history
  await saveSnapshotIfNeeded(summary);

  return { delivered: true, notificationId };
}

async function saveSnapshotIfNeeded(summary: DailySummary): Promise<void> {
  try {
    const alreadySaved = await hasSnapshotForToday(summary.date);
    if (!alreadySaved) {
      await saveDailySummarySnapshot(summary);
    }
  } catch {
    // Snapshot saving is best-effort, don't fail delivery
  }
}

function toCstDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

export async function getDailySummary(): Promise<DailySummary> {
  const db = getDatabase();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateStr = toCstDate(now);

  if (!db) {
    // Mock mode
    const recentEvents = mockEvents.filter(
      (event) => new Date(event.occurredAt).getTime() >= twentyFourHoursAgo.getTime(),
    );

    const priceEvents = mockEvents.filter((event) => event.infoType === "price");
    const financialEvents = mockEvents.filter((event) => event.infoType === "financial_event");
    const releaseEvents = mockEvents.filter((event) => event.signal === "new_announcement");
    const contentUpdateEvents = mockEvents.filter((event) => event.infoType === "content_update");

    function computeDirectionBreakdown(events: typeof mockEvents) {
      const recent = events.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime());
      const countBySignal = (list: typeof mockEvents, signal: string) => list.filter((e) => e.signal === signal).length;
      return {
        bullish: countBySignal(events, "bullish") + countBySignal(events, "liquidity_injection"),
        bearish: countBySignal(events, "bearish") + countBySignal(events, "liquidity_withdrawal"),
        neutral: countBySignal(events, "neutral") + countBySignal(events, "new_financial_event"),
        recentBullish: countBySignal(recent, "bullish") + countBySignal(recent, "liquidity_injection"),
        recentBearish: countBySignal(recent, "bearish") + countBySignal(recent, "liquidity_withdrawal"),
        recentNeutral: countBySignal(recent, "neutral") + countBySignal(recent, "new_financial_event"),
      };
    }

    const warningSources = mockSources
      .filter((source) => source.status === "warning")
      .map((source) => ({
        id: source.id,
        name: source.name,
        themeName: source.themeName,
        status: source.status,
        lastErrorMessage: source.lastErrorMessage ?? null,
      }));

    const mockSummary: DailySummary = {
      generatedAt: now.toISOString(),
      date: dateStr,
      items: [
        {
          category: "price-signals",
          label: "Price Signals",
          count: priceEvents.length,
          recentCount: priceEvents.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime()).length,
          latestEvent: priceEvents[0]
            ? {
                id: priceEvents[0].id,
                title: priceEvents[0].title,
                signal: priceEvents[0].signal,
                occurredAt: priceEvents[0].occurredAt,
                themeId: priceEvents[0].themeId,
                themeName: priceEvents[0].themeName,
              }
            : null,
        },
        {
          category: "financial-events",
          label: "Financial Events",
          count: financialEvents.length,
          recentCount: financialEvents.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime()).length,
          latestEvent: financialEvents[0]
            ? {
                id: financialEvents[0].id,
                title: financialEvents[0].title,
                signal: financialEvents[0].signal,
                occurredAt: financialEvents[0].occurredAt,
                themeId: financialEvents[0].themeId,
                themeName: financialEvents[0].themeName,
              }
            : null,
          directionBreakdown: computeDirectionBreakdown(financialEvents),
        },
        {
          category: "official-releases",
          label: "Official Releases",
          count: releaseEvents.length,
          recentCount: releaseEvents.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime()).length,
          latestEvent: releaseEvents[0]
            ? {
                id: releaseEvents[0].id,
                title: releaseEvents[0].title,
                signal: releaseEvents[0].signal,
                occurredAt: releaseEvents[0].occurredAt,
                themeId: releaseEvents[0].themeId,
                themeName: releaseEvents[0].themeName,
              }
            : null,
        },
        {
          category: "content-updates",
          label: "Content Updates",
          count: contentUpdateEvents.length,
          recentCount: contentUpdateEvents.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime()).length,
          latestEvent: contentUpdateEvents[0]
            ? {
                id: contentUpdateEvents[0].id,
                title: contentUpdateEvents[0].title,
                signal: contentUpdateEvents[0].signal,
                occurredAt: contentUpdateEvents[0].occurredAt,
                themeId: contentUpdateEvents[0].themeId,
                themeName: contentUpdateEvents[0].themeName,
              }
            : null,
        },
      ],
      warningSources,
      totalEvents: mockEvents.length,
      recentEvents: recentEvents.length,
    };

    return mockSummary;
  }

  // Database mode
  // Only load recent events (last 30 days) instead of the entire table
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [events, totalCount] = await Promise.all([
    db
      .selectFrom("events")
      .innerJoin("themes", "themes.id", "events.theme_id")
      .select([
        "events.id as id",
        "events.title as title",
        "events.signal as signal",
        "events.occurred_at as occurredAt",
        "events.theme_id as themeId",
        "themes.info_type as infoType",
      ])
      .where("events.occurred_at", ">=", thirtyDaysAgo as any)
      .execute(),
    db
      .selectFrom("events")
      .select(({ fn }) => fn.count("id").as("count"))
      .executeTakeFirst(),
  ]);

  const themes = await db
    .selectFrom("themes")
    .select(["id", "name"])
    .execute();

  const themeNameMap = new Map(themes.map((t) => [t.id, t.name]));

  // Get warning sources with their latest error message (deduped by source)
  // Use NULLS LAST to ensure sources with actual runs get their most recent run first,
  // not the NULL row from LEFT JOIN (PostgreSQL defaults to NULLS FIRST for DESC).
  const warningSourcesRaw = await db
    .selectFrom("sources as s")
    .leftJoin("source_runs as sr", (join) =>
      join.onRef("sr.source_id", "=", "s.id").on("sr.trigger_type", "!=", "test"),
    )
    .select([
      "s.id as id",
      "s.name as name",
      "s.theme_id as themeId",
      "s.status as status",
      "sr.error_message as lastErrorMessage",
      "sr.created_at as runCreatedAt",
    ])
    .where("s.status", "=", "warning")
    .orderBy(sql`sr.created_at desc nulls last`)
    .execute();

  // Dedup by source id, keeping the first (most recent run) for each source
  const seenSourceIds = new Set<string>();
  const sources = warningSourcesRaw.filter((row) => {
    if (seenSourceIds.has(row.id)) return false;
    seenSourceIds.add(row.id);
    return true;
  });

  const recentEvents = events.filter(
    (event) => new Date(event.occurredAt).getTime() >= twentyFourHoursAgo.getTime(),
  );

  const priceEvents = events.filter((event) => event.infoType === "price");
  const financialEvents = events.filter((event) => event.infoType === "financial_event");
  const releaseEvents = events.filter((event) => event.signal === "new_announcement");
  const contentUpdateEvents = events.filter((event) => event.infoType === "content_update");

  function computeDirectionBreakdown(eventList: typeof events) {
    const recent = eventList.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime());
    const countBySignal = (list: typeof events, signal: string) => list.filter((e) => e.signal === signal).length;
    return {
      bullish: countBySignal(eventList, "bullish") + countBySignal(eventList, "liquidity_injection"),
      bearish: countBySignal(eventList, "bearish") + countBySignal(eventList, "liquidity_withdrawal"),
      neutral: countBySignal(eventList, "neutral") + countBySignal(eventList, "new_financial_event"),
      recentBullish: countBySignal(recent, "bullish") + countBySignal(recent, "liquidity_injection"),
      recentBearish: countBySignal(recent, "bearish") + countBySignal(recent, "liquidity_withdrawal"),
      recentNeutral: countBySignal(recent, "neutral") + countBySignal(recent, "new_financial_event"),
    };
  }

  function getLatestEvent(eventList: typeof events) {
    const sorted = [...eventList].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    const latest = sorted[0];
    if (!latest) return null;
    return {
      id: latest.id,
      title: latest.title,
      signal: latest.signal,
      occurredAt: latest.occurredAt instanceof Date ? latest.occurredAt.toISOString() : latest.occurredAt,
      themeId: latest.themeId,
      themeName: themeNameMap.get(latest.themeId) ?? "Unknown Theme",
    };
  }

  return {
    generatedAt: now.toISOString(),
    date: dateStr,
    items: [
      {
        category: "price-signals",
        label: "Price Signals",
        count: priceEvents.length,
        recentCount: priceEvents.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime()).length,
        latestEvent: getLatestEvent(priceEvents),
      },
      {
        category: "financial-events",
        label: "Financial Events",
        count: financialEvents.length,
        recentCount: financialEvents.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime()).length,
        latestEvent: getLatestEvent(financialEvents),
        directionBreakdown: computeDirectionBreakdown(financialEvents),
      },
      {
        category: "official-releases",
        label: "Official Releases",
        count: releaseEvents.length,
        recentCount: releaseEvents.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime()).length,
        latestEvent: getLatestEvent(releaseEvents),
      },
      {
        category: "content-updates",
        label: "Content Updates",
        count: contentUpdateEvents.length,
        recentCount: contentUpdateEvents.filter((e) => new Date(e.occurredAt).getTime() >= twentyFourHoursAgo.getTime()).length,
        latestEvent: getLatestEvent(contentUpdateEvents),
      },
    ],
    warningSources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      themeName: themeNameMap.get(source.themeId) ?? "Unknown Theme",
      status: source.status,
      lastErrorMessage: source.lastErrorMessage ?? null,
    })),
    totalEvents: Number(totalCount?.count ?? 0),
    recentEvents: recentEvents.length,
  };
}
