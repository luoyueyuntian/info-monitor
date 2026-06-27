import type {
  EventSummary,
  FeedbackAggregation,
  FeedbackAggregationItem,
  InboxSectionId,
} from "@info-monitor/shared-contracts";
import { INBOX_SECTION_IDS } from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";
import { emitSSE } from "./event-bus.js";
import { mockEventFeedback, mockEvents, mockEventStatusHistory } from "../lib/mock-store.js";

export const inboxSectionIds = INBOX_SECTION_IDS;

export type { InboxSectionId };

type EventListItem = EventSummary;

export type TriggerReason = {
  ruleKey: string;
  ruleName: string;
  evidence: string[];
  changeDetails?: Record<string, unknown>;
  originalRecord?: Record<string, unknown>;
};

async function getLatestStatusChangedAtMap(eventIds: string[]) {
  const db = getDatabase();

  if (!eventIds.length) {
    return new Map<string, string | null>();
  }

  if (!db) {
    const map = new Map<string, string | null>();
    for (const eventId of eventIds) {
      const latest = mockEventStatusHistory
        .filter((item) => item.eventId === eventId)
        .sort((left, right) => (left.changedAt < right.changedAt ? 1 : -1))[0];
      map.set(eventId, latest?.changedAt ?? null);
    }
    return map;
  }

  const rows = await db
    .selectFrom("event_status_history")
    .select(({ fn }) => [
      "event_id as eventId",
      fn.max("changed_at").as("latestChangedAt"),
    ])
    .where("event_id", "in", eventIds)
    .groupBy("event_id")
    .execute();

  const map = new Map<string, string | null>();
  for (const row of rows) {
    map.set(row.eventId, row.latestChangedAt?.toISOString?.() ?? row.latestChangedAt ?? null);
  }
  return map;
}

function toIsoTimestamp(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function getRuleName(eventType?: string | null): string {
  const ruleNames: Record<string, string> = {
    price_low: "价格新低规则",
    price_high: "价格新高规则",
    price_breakout: "价格突破规则",
    consecutive_movement: "连续异动规则",
    financial_direction: "金融方向规则",
    content_update: "内容更新规则",
    news_announcement: "公告关键词规则",
    macro_deviation: "宏观偏差规则",
  };

  return ruleNames[eventType || ""] || "未知规则";
}

function buildTriggerReason(event: {
  eventType?: string;
  signal?: string;
  evidence?: string[] | string;
  context?: Record<string, unknown> | null;
}): TriggerReason {
  const evidence = Array.isArray(event.evidence)
    ? event.evidence
    : typeof event.evidence === "string"
      ? JSON.parse(event.evidence)
      : [];

  return {
    ruleKey: event.eventType || "unknown",
    ruleName: getRuleName(event.eventType),
    evidence,
    originalRecord: event.context ?? undefined,
  };
}

function buildEventExplanation(input: {
  infoType?: string | null;
  signal?: string | null;
  title: string;
  summary: string;
  sourceHealthScore?: number;
  recentSimilarCount?: number;
  impactLevel?: string;
}) {
  // Compute confidence score (0-100)
  // Based on: source health (40%), signal clarity (30%), event freshness (30%)
  let confidence = 70; // baseline

  // Source health contribution (0-40)
  if (input.sourceHealthScore !== undefined) {
    confidence = Math.round(30 + (input.sourceHealthScore / 100) * 40);
  }

  // Signal clarity: strong signals get higher confidence
  const strongSignals = ["30d_low", "bullish", "bearish", "liquidity_injection", "liquidity_withdrawal"];
  if (input.signal && strongSignals.includes(input.signal)) {
    confidence = Math.min(100, confidence + 15);
  }

  // Recency: similar recent events reinforce confidence
  if (input.recentSimilarCount && input.recentSimilarCount >= 2) {
    confidence = Math.min(100, confidence + 10);
  }

  // Impact level: high-impact events get confidence boost
  if (input.impactLevel === "high") {
    confidence = Math.min(100, confidence + 10);
  }

  // Confidence label for display
  const confidenceLabel =
    confidence >= 85 ? "高" : confidence >= 60 ? "中" : "低";

  if (input.infoType === "price") {
    return {
      confidence,
      confidenceLabel,
      headline: "这是一个直接影响买入判断的价格信号",
      impact: "它意味着当前监控对象出现了值得优先复核的价格变化，通常会直接影响你是否继续跟进。",
      whyItMatters: [
        "价格事件通常离最终决策最近，会直接改变你对「是否值得买」的判断。",
        "如果同配置出现新低，往往意味着当前观察价值上升，但仍需确认是否真实可成交。",
      ],
      actions: [
        "优先核对规格、成色、附件和成交条件，确认是否真的是同配置低价。",
        "如需更高把握，补跑其他来源，再判断这次价格变化是否仍然成立。",
      ],
      reliabilityHints: [
        input.sourceHealthScore && input.sourceHealthScore >= 80
          ? "来源健康度较高，数据可信度好"
          : input.sourceHealthScore && input.sourceHealthScore < 50
            ? "来源健康度较低，建议交叉验证"
            : null,
        input.signal === "30d_low" ? "30天新低信号需要确认是同配置对比" : null,
      ].filter(Boolean) as string[],
    };
  }

  if (input.infoType === "financial_event") {
    return {
      confidence,
      confidenceLabel,
      headline: "这是一个会改变短期市场判断的金融事件",
      impact: "它通常对应流动性、政策操作或市场预期变化，需要结合结构化字段进一步解读。",
      whyItMatters: [
        "金融事件会直接影响你对短期市场环境是偏宽松、偏收紧还是中性的判断。",
        "如果同方向事件连续出现，通常意味着当前判断正在被强化。",
      ],
      actions: [
        "优先查看方向、金额、期限和操作类型，确认这条事件的核心含义。",
        "再结合后续公告和市场反应，判断是否需要调整自己的观察或交易计划。",
      ],
      reliabilityHints: [
        input.impactLevel === "high" ? "高影响力操作，建议重点关注" : null,
        input.sourceHealthScore && input.sourceHealthScore >= 80
          ? "来源健康度较高，数据可信度好"
          : input.sourceHealthScore && input.sourceHealthScore < 50
            ? "来源健康度较低，建议交叉验证"
            : null,
      ].filter(Boolean) as string[],
    };
  }

  if (input.infoType === "content_update") {
    return {
      confidence,
      confidenceLabel,
      headline: "这是一个需要快速判断影响范围的内容更新",
      impact: "它说明监控对象刚刚发生了新的功能、版本或页面内容变化，重点是先判断这次变化会影响哪些主题和后续动作。",
      whyItMatters: [
        "内容更新通常是产品能力、运营动作或竞品节奏变化的直接信号。",
        "如果相似更新连续出现，往往说明当前路线图或市场动作正在被持续强化。",
      ],
      actions: [
        "优先查看更新类型、原文链接和摘要，确认这次具体改了什么。",
        "再结合历史更新和你的关注主题，判断是否需要跟进分析、记录竞品动作或转成新的任务。",
      ],
      reliabilityHints: [
        input.recentSimilarCount && input.recentSimilarCount >= 3
          ? "近期同类更新频繁，说明产品迭代节奏加快"
          : null,
      ].filter(Boolean) as string[],
    };
  }

  return {
    confidence,
    confidenceLabel,
    headline: "这是一个值得继续跟踪的官方发布信号",
    impact: "它说明官方渠道有了新的发布，可能改变你对主题的后续判断，但通常需要先读正文确认含义。",
    whyItMatters: [
      "官方发布往往是主题判断变化的上游来源。",
      "是否真正构成利好、利空或中性，需要结合发布正文和上下文来确认。",
    ],
    actions: [
      "先打开原始来源，确认发布正文到底说了什么。",
      "如果影响较大，再把它转成更明确的判断或后续行动。",
    ],
    reliabilityHints: [
      input.sourceHealthScore && input.sourceHealthScore >= 80
        ? "来源健康度较高，数据可信度好"
        : input.sourceHealthScore && input.sourceHealthScore < 50
          ? "来源健康度较低，建议交叉验证"
          : null,
    ].filter(Boolean) as string[],
  };
}

function toEventListItem(event: (typeof mockEvents)[number]): EventListItem {
  return event;
}

export function filterEventsByInboxSection<T extends { infoType?: string | null; signal?: string | null }>(
  events: T[],
  sectionId: string,
) {
  if (sectionId === "price-signals") {
    return events.filter((event) => event.infoType === "price");
  }

  if (sectionId === "content-updates") {
    return events.filter((event) => event.infoType === "content_update");
  }

  if (sectionId === "official-releases") {
    return events.filter((event) => event.signal === "new_announcement");
  }

  if (sectionId === "financial-events") {
    return events.filter((event) => event.infoType === "financial_event");
  }

  return [];
}

export async function listDashboardEvents(): Promise<EventListItem[]> {
  const db = getDatabase();

  if (!db) {
    const events = mockEvents.map(toEventListItem);
    const changedAtMap = await getLatestStatusChangedAtMap(events.map((item) => item.id));
    return events.map((event) => ({
      ...event,
      latestStatusChangedAt: changedAtMap.get(event.id) ?? null,
    }));
  }

  const rows = await db
    .selectFrom("events as e")
    .innerJoin("themes as t", "t.id", "e.theme_id")
    .leftJoin("changes as c", "c.id", "e.change_id")
    .leftJoin("normalized_records as nr", "nr.id", "c.normalized_record_id")
    .select([
      "e.id as id",
      "e.theme_id as themeId",
      "t.name as themeName",
      "e.title as title",
      "e.signal as signal",
      "e.status as status",
      "e.is_read as isRead",
      "e.is_bookmarked as isBookmarked",
      "e.bookmarked_at as bookmarkedAt",
      "e.event_type as eventType",
      "e.occurred_at as occurredAt",
      "e.summary as summary",
      "nr.info_type as infoType",
      "nr.content as context",
    ])
    .orderBy("e.occurred_at desc")
    .limit(20)
    .execute();

  const baseEvents: EventListItem[] = rows.map((row) => ({
    ...row,
    bookmarkedAt: toIsoTimestamp(row.bookmarkedAt),
    occurredAt: row.occurredAt.toISOString?.() ?? row.occurredAt,
  }));
  const changedAtMap = await getLatestStatusChangedAtMap(baseEvents.map((item) => item.id));
  return baseEvents.map((event) => ({
    ...event,
    latestStatusChangedAt: changedAtMap.get(event.id) ?? null,
  }));
}

export async function listBookmarkedEvents(limit = 8): Promise<EventListItem[]> {
  const db = getDatabase();

  if (!db) {
    const events = mockEvents
      .filter((event) => event.isBookmarked)
      .map(toEventListItem)
      .sort((left, right) => {
        const leftChanged = new Date(left.bookmarkedAt ?? left.latestStatusChangedAt ?? left.occurredAt).getTime();
        const rightChanged = new Date(right.bookmarkedAt ?? right.latestStatusChangedAt ?? right.occurredAt).getTime();
        return rightChanged - leftChanged;
      })
      .slice(0, limit);
    const changedAtMap = await getLatestStatusChangedAtMap(events.map((item) => item.id));
    return events.map((event) => ({
      ...event,
      latestStatusChangedAt: changedAtMap.get(event.id) ?? null,
    }));
  }

  const rows = await db
    .selectFrom("events as e")
    .innerJoin("themes as t", "t.id", "e.theme_id")
    .leftJoin("changes as c", "c.id", "e.change_id")
    .leftJoin("normalized_records as nr", "nr.id", "c.normalized_record_id")
    .select([
      "e.id as id",
      "e.theme_id as themeId",
      "t.name as themeName",
      "e.title as title",
      "e.signal as signal",
      "e.status as status",
      "e.is_read as isRead",
      "e.is_bookmarked as isBookmarked",
      "e.bookmarked_at as bookmarkedAt",
      "e.event_type as eventType",
      "e.occurred_at as occurredAt",
      "e.summary as summary",
      "nr.info_type as infoType",
      "nr.content as context",
    ])
    .where("e.is_bookmarked", "=", true)
    .orderBy("e.occurred_at desc")
    .limit(limit)
    .execute();

  const baseEvents: EventListItem[] = rows.map((row) => ({
    ...row,
    bookmarkedAt: toIsoTimestamp(row.bookmarkedAt),
    occurredAt: row.occurredAt.toISOString?.() ?? row.occurredAt,
  }));
  const changedAtMap = await getLatestStatusChangedAtMap(baseEvents.map((item) => item.id));
  return baseEvents
    .map((event) => ({
      ...event,
      latestStatusChangedAt: changedAtMap.get(event.id) ?? null,
    }))
    .sort((left, right) => {
      const leftTime = new Date(left.bookmarkedAt ?? left.latestStatusChangedAt ?? left.occurredAt).getTime();
      const rightTime = new Date(right.bookmarkedAt ?? right.latestStatusChangedAt ?? right.occurredAt).getTime();
      return rightTime - leftTime;
    });
}

export async function countInboxSectionEvents() {
  const events = await listInboxSectionEvents();
  const threshold = Date.now() - 24 * 60 * 60 * 1000;
  const countRecent = (items: EventListItem[]) =>
    items.filter((event) => {
      const time = new Date(event.occurredAt).getTime();
      return !Number.isNaN(time) && time >= threshold;
    }).length;

  const priceEvents = filterEventsByInboxSection(events, "price-signals");
  const contentUpdateEvents = filterEventsByInboxSection(events, "content-updates");
  const officialEvents = filterEventsByInboxSection(events, "official-releases");
  const financialEvents = filterEventsByInboxSection(events, "financial-events");

  return {
    "price-signals": {
      total: priceEvents.length,
      recent: countRecent(priceEvents),
    },
    "content-updates": {
      total: contentUpdateEvents.length,
      recent: countRecent(contentUpdateEvents),
    },
    "official-releases": {
      total: officialEvents.length,
      recent: countRecent(officialEvents),
    },
    "financial-events": {
      total: financialEvents.length,
      recent: countRecent(financialEvents),
    },
  };
}

export async function listInboxSectionEvents(sectionId?: string): Promise<EventListItem[]> {
  const db = getDatabase();

  if (!db) {
    const events = [...mockEvents]
      .map(toEventListItem)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    const filtered = sectionId ? filterEventsByInboxSection(events, sectionId) : events;
    const changedAtMap = await getLatestStatusChangedAtMap(filtered.map((item) => item.id));
    return filtered.map((event) => ({
      ...event,
      latestStatusChangedAt: changedAtMap.get(event.id) ?? null,
    }));
  }

  const rows = await db
    .selectFrom("events as e")
    .innerJoin("themes as t", "t.id", "e.theme_id")
    .leftJoin("changes as c", "c.id", "e.change_id")
    .leftJoin("normalized_records as nr", "nr.id", "c.normalized_record_id")
    .select([
      "e.id as id",
      "e.theme_id as themeId",
      "t.name as themeName",
      "e.title as title",
      "e.signal as signal",
      "e.status as status",
      "e.is_read as isRead",
      "e.is_bookmarked as isBookmarked",
      "e.bookmarked_at as bookmarkedAt",
      "e.event_type as eventType",
      "e.occurred_at as occurredAt",
      "e.summary as summary",
      "nr.info_type as infoType",
      "nr.content as context",
    ])
    .orderBy("e.occurred_at desc")
    .execute();

  const events: EventListItem[] = rows.map((row) => ({
    ...row,
    bookmarkedAt: toIsoTimestamp(row.bookmarkedAt),
    occurredAt: row.occurredAt.toISOString?.() ?? row.occurredAt,
  }));
  const filtered = sectionId ? filterEventsByInboxSection(events, sectionId) : events;
  const changedAtMap = await getLatestStatusChangedAtMap(filtered.map((item) => item.id));
  return filtered.map((event) => ({
    ...event,
    latestStatusChangedAt: changedAtMap.get(event.id) ?? null,
  }));
}

export async function getEventDetail(eventId: string) {
  const db = getDatabase();

  if (!db) {
    const event = mockEvents.find((item) => item.id === eventId) ?? null;

    if (!event) {
      return null;
    }

    return {
      ...event,
      explanation: buildEventExplanation({
        infoType: event.infoType,
        signal: event.signal,
        title: event.title,
        summary: event.summary,
        sourceHealthScore: 70, // Mock mode: default baseline
      }),
      triggerReason: buildTriggerReason(event),
      statusHistory: mockEventStatusHistory
        .filter((item) => item.eventId === eventId)
        .sort((left, right) => (left.changedAt < right.changedAt ? 1 : -1)),
    };
  }

  const row = await db
    .selectFrom("events as e")
    .innerJoin("themes as t", "t.id", "e.theme_id")
    .leftJoin("changes as c", "c.id", "e.change_id")
    .leftJoin("normalized_records as nr", "nr.id", "c.normalized_record_id")
    .leftJoin("sources as s", "s.id", "e.source_id")
    .select([
      "e.id as id",
      "e.theme_id as themeId",
      "t.name as themeName",
      "e.title as title",
      "e.signal as signal",
      "e.status as status",
      "e.is_read as isRead",
      "e.is_bookmarked as isBookmarked",
      "e.bookmarked_at as bookmarkedAt",
      "e.event_type as eventType",
      "e.occurred_at as occurredAt",
      "e.summary as summary",
      "e.evidence as evidence",
      "e.change_id as changeId",
      "nr.info_type as infoType",
      "nr.content as context",
      "s.name as sourceName",
      "s.status as sourceStatus",
    ])
    .where("e.id", "=", eventId)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  const statusHistoryRows = await db
    .selectFrom("event_status_history")
    .select([
      "id",
      "event_id as eventId",
      "from_status as fromStatus",
      "to_status as toStatus",
      "changed_at as changedAt",
    ])
    .where("event_id", "=", eventId)
    .orderBy("changed_at desc")
    .execute();

  // Get change details if available
  let changeDetails: Record<string, unknown> | undefined;
  if (row.changeId) {
    const change = await db
      .selectFrom("changes")
      .select(["details"])
      .where("id", "=", row.changeId)
      .executeTakeFirst();

    if (change?.details) {
      changeDetails = typeof change.details === "string"
        ? JSON.parse(change.details)
        : change.details as Record<string, unknown>;
    }
  }

  // Derive source health score from source status
  let sourceHealthScore = 70; // baseline
  if (row.sourceStatus === "healthy") sourceHealthScore = 100;
  else if (row.sourceStatus === "warning") sourceHealthScore = 40;

  return {
    ...row,
    bookmarkedAt: toIsoTimestamp(row.bookmarkedAt),
    occurredAt: row.occurredAt.toISOString?.() ?? row.occurredAt,
    explanation: buildEventExplanation({
      infoType: row.infoType,
      signal: row.signal,
      title: row.title,
      summary: row.summary,
      sourceHealthScore,
    }),
    triggerReason: {
      ruleKey: row.eventType || "unknown",
      ruleName: getRuleName(row.eventType),
      evidence: Array.isArray(row.evidence)
        ? row.evidence
        : typeof row.evidence === "string"
          ? JSON.parse(row.evidence)
          : [],
      changeDetails,
      originalRecord: row.context ?? undefined,
    },
    statusHistory: statusHistoryRows.map((item) => ({
      ...item,
      changedAt: item.changedAt.toISOString?.() ?? item.changedAt,
    })),
  };
}

export async function updateEventState(
  eventId: string,
  input: {
    status?: string;
    isRead?: boolean;
    isBookmarked?: boolean;
  },
) {
  const db = getDatabase();

  if (!db) {
    const event = mockEvents.find((item) => item.id === eventId);

    if (!event) {
      return null;
    }

    if (typeof input.status === "string") {
      const previousStatus = event.status ?? "open";
      event.status = input.status;

      if (previousStatus !== input.status) {
        mockEventStatusHistory.unshift({
          id: createId("event_status_history"),
          eventId,
          fromStatus: previousStatus,
          toStatus: input.status,
          changedAt: new Date().toISOString(),
        });
      }
    }

    if (typeof input.isRead === "boolean") {
      event.isRead = input.isRead;
    }

    if (typeof input.isBookmarked === "boolean") {
      event.isBookmarked = input.isBookmarked;
      event.bookmarkedAt = input.isBookmarked ? new Date().toISOString() : null;
    }

    const result = {
      id: eventId,
      status: event.status ?? "open",
      isRead: event.isRead ?? false,
      isBookmarked: event.isBookmarked ?? false,
      bookmarkedAt: event.bookmarkedAt ?? null,
    };
    emitSSE("event_status_changed", { eventId, ...result });
    return result;
  }

  const existing = await db
    .selectFrom("events")
    .select(["id", "status", "is_read as isRead", "is_bookmarked as isBookmarked", "bookmarked_at as bookmarkedAt"])
    .where("id", "=", eventId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  const updatePatch: Record<string, unknown> = {};

  if (typeof input.status === "string") {
    updatePatch.status = input.status;
  }

  if (typeof input.isRead === "boolean") {
    updatePatch.is_read = input.isRead;
  }

  if (typeof input.isBookmarked === "boolean") {
    updatePatch.is_bookmarked = input.isBookmarked;
    updatePatch.bookmarked_at = input.isBookmarked ? new Date().toISOString() : null;
  }

  if (!Object.keys(updatePatch).length) {
    return {
      id: eventId,
      status: existing.status,
      isRead: existing.isRead,
      isBookmarked: existing.isBookmarked,
      bookmarkedAt: toIsoTimestamp(existing.bookmarkedAt),
    };
  }

  await db
    .updateTable("events")
    .set(updatePatch)
    .where("id", "=", eventId)
    .execute();

  if (typeof input.status === "string" && existing.status !== input.status) {
    await db
      .insertInto("event_status_history")
      .values({
        id: createId("event_status_history"),
        event_id: eventId,
        from_status: existing.status,
        to_status: input.status,
        changed_at: new Date().toISOString(),
      })
      .execute();
  }

  const result = {
    id: eventId,
    status: typeof input.status === "string" ? input.status : existing.status,
    isRead: typeof input.isRead === "boolean" ? input.isRead : existing.isRead,
    isBookmarked: typeof input.isBookmarked === "boolean" ? input.isBookmarked : existing.isBookmarked,
    bookmarkedAt:
      typeof input.isBookmarked === "boolean"
        ? input.isBookmarked
          ? new Date().toISOString()
          : null
        : toIsoTimestamp(existing.bookmarkedAt),
  };

  emitSSE("event_status_changed", { eventId, ...result });

  return result;
}

export async function updateEventStatus(eventId: string, status: string) {
  return updateEventState(eventId, { status });
}

// ─── Event Feedback ─────────────────────────────────────────────────────────

export type EventFeedback = "useful" | "noise" | "watch";

export type EventFeedbackRecord = {
  id: string;
  eventId: string;
  feedback: EventFeedback;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getEventFeedback(eventId: string): Promise<EventFeedbackRecord | null> {
  const db = getDatabase();

  if (!db) {
    // Mock mode - read from in-memory feedback store
    const record = mockEventFeedback.find((f) => f.eventId === eventId);
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      eventId: record.eventId,
      feedback: record.feedback as EventFeedback,
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  const row = await db
    .selectFrom("event_feedback")
    .select([
      "id",
      "event_id as eventId",
      "feedback",
      "note",
      "created_at as createdAt",
      "updated_at as updatedAt",
    ])
    .where("event_id", "=", eventId)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    eventId: row.eventId,
    feedback: row.feedback as EventFeedback,
    note: row.note,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export async function upsertEventFeedback(
  eventId: string,
  feedback: EventFeedback,
  note?: string,
): Promise<EventFeedbackRecord | null> {
  const db = getDatabase();

  if (!db) {
    // Mock mode - upsert into in-memory feedback store
    const now = new Date().toISOString();
    const existing = mockEventFeedback.find((f) => f.eventId === eventId);

    if (existing) {
      existing.feedback = feedback;
      existing.note = note ?? null;
      existing.updatedAt = now;
      return {
        id: existing.id,
        eventId: existing.eventId,
        feedback: existing.feedback as EventFeedback,
        note: existing.note,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }

    const record = {
      id: createId("event_feedback"),
      eventId,
      feedback,
      note: note ?? null,
      createdAt: now,
      updatedAt: now,
    };
    mockEventFeedback.push(record);
    return {
      ...record,
      feedback: record.feedback as EventFeedback,
    };
  }

  // Check if event exists
  const event = await db
    .selectFrom("events")
    .select(["id"])
    .where("id", "=", eventId)
    .executeTakeFirst();

  if (!event) {
    return null;
  }

  const now = new Date().toISOString();
  const id = createId("event_feedback");

  // Atomic upsert using ON CONFLICT — eliminates TOCTOU race
  const row = await db
    .insertInto("event_feedback")
    .values({
      id,
      event_id: eventId,
      feedback,
      note: note ?? null,
      created_at: now,
      updated_at: now,
    })
    .onConflict((oc) =>
      oc.column("event_id").doUpdateSet({
        feedback,
        note: note ?? null,
        updated_at: now,
      })
    )
    .returning(["id", "event_id as eventId", "feedback", "note", "created_at as createdAt", "updated_at as updatedAt"])
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    eventId: row.eventId,
    feedback: row.feedback as EventFeedback,
    note: row.note,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export async function deleteEventFeedback(eventId: string): Promise<boolean> {
  const db = getDatabase();

  if (!db) {
    // Mock mode - remove from in-memory feedback store (idempotent: always succeed)
    const index = mockEventFeedback.findIndex((f) => f.eventId === eventId);
    if (index !== -1) {
      mockEventFeedback.splice(index, 1);
    }
    return true;
  }

  // Check existence first — execute() result doesn't reliably indicate affected rows
  const existing = await db
    .selectFrom("event_feedback")
    .select(["id"])
    .where("event_id", "=", eventId)
    .executeTakeFirst();

  if (!existing) {
    return true; // Idempotent: deleting non-existent feedback is a no-op
  }

  await db
    .deleteFrom("event_feedback")
    .where("event_id", "=", eventId)
    .execute();

  return true;
}

export async function getMultipleEventFeedback(
  eventIds: string[],
): Promise<Map<string, EventFeedbackRecord>> {
  const db = getDatabase();
  const map = new Map<string, EventFeedbackRecord>();

  if (!eventIds.length) {
    return map;
  }

  if (!db) {
    // Mock mode - read from in-memory feedback store
    for (const eventId of eventIds) {
      const record = mockEventFeedback.find((f) => f.eventId === eventId);
      if (record) {
        map.set(record.eventId, {
          id: record.id,
          eventId: record.eventId,
          feedback: record.feedback as EventFeedback,
          note: record.note,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      }
    }
    return map;
  }

  const rows = await db
    .selectFrom("event_feedback")
    .select([
      "id",
      "event_id as eventId",
      "feedback",
      "note",
      "created_at as createdAt",
      "updated_at as updatedAt",
    ])
    .where("event_id", "in", eventIds)
    .execute();

  for (const row of rows) {
    map.set(row.eventId, {
      id: row.id,
      eventId: row.eventId,
      feedback: row.feedback as EventFeedback,
      note: row.note,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    });
  }

  return map;
}

export type { FeedbackAggregation, FeedbackAggregationItem };

type FeedbackRow = {
  feedback: string;
  signal: string;
  eventType: string;
  themeId: string;
  themeName: string;
};

function aggregateFeedbackBy(
  rows: FeedbackRow[],
  key: "signal" | "eventType" | "themeId",
  labelFn: (item: FeedbackRow) => string,
): FeedbackAggregationItem[] {
  const map = new Map<string, { label: string; useful: number; noise: number; watch: number }>();

  for (const item of rows) {
    const k = item[key];
    const existing = map.get(k) ?? { label: labelFn(item), useful: 0, noise: 0, watch: 0 };

    if (item.feedback === "useful") existing.useful++;
    else if (item.feedback === "noise") existing.noise++;
    else if (item.feedback === "watch") existing.watch++;

    map.set(k, existing);
  }

  return Array.from(map.entries()).map(([k, v]) => ({
    key: k,
    label: v.label,
    useful: v.useful,
    noise: v.noise,
    watch: v.watch,
    total: v.useful + v.noise + v.watch,
  })).sort((a, b) => b.total - a.total);
}

export async function getFeedbackAggregation(): Promise<FeedbackAggregation> {
  const db = getDatabase();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (!db) {
    // Mock mode - aggregate from in-memory feedback
    const recentFeedbackRecords = mockEventFeedback.filter(
      (f) => new Date(f.updatedAt).getTime() >= twentyFourHoursAgo.getTime(),
    );

    const recentFeedback: FeedbackRow[] = recentFeedbackRecords.map((feedback) => {
      const event = mockEvents.find((e) => e.id === feedback.eventId);
      return {
        feedback: feedback.feedback,
        signal: event?.signal ?? "unknown",
        eventType: event?.eventType ?? "unknown",
        themeId: event?.themeId ?? "unknown",
        themeName: event?.themeName ?? "Unknown Theme",
      };
    });

    return {
      bySignal: aggregateFeedbackBy(recentFeedback, "signal", (item) => item.signal),
      byEventType: aggregateFeedbackBy(recentFeedback, "eventType", (item) => item.eventType),
      byTheme: aggregateFeedbackBy(recentFeedback, "themeId", (item) => item.themeName),
      totalFeedback: mockEventFeedback.length,
      recentFeedback: recentFeedback.length,
    };
  }

  // Database mode
  const feedbackRows = await db
    .selectFrom("event_feedback")
    .innerJoin("events", "events.id", "event_feedback.event_id")
    .innerJoin("themes", "themes.id", "events.theme_id")
    .select([
      "event_feedback.feedback as feedback",
      "event_feedback.updated_at as updatedAt",
      "events.signal as signal",
      "events.event_type as eventType",
      "events.theme_id as themeId",
      "themes.name as themeName",
    ])
    .execute();

  const recentFeedback = feedbackRows.filter(
    (row) => new Date(row.updatedAt).getTime() >= twentyFourHoursAgo.getTime(),
  );

  return {
    bySignal: aggregateFeedbackBy(recentFeedback, "signal", (row) => row.signal),
    byEventType: aggregateFeedbackBy(recentFeedback, "eventType", (row) => row.eventType),
    byTheme: aggregateFeedbackBy(recentFeedback, "themeId", (row) => row.themeName),
    totalFeedback: feedbackRows.length,
    recentFeedback: recentFeedback.length,
  };
}
