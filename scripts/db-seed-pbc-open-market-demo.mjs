import dotenv from "dotenv";
import pg from "pg";

import {
  upsertChange,
  upsertEvent,
  upsertEventStatusHistory,
  upsertNormalizedRecord,
  upsertRawSnapshot,
  upsertSource,
  upsertSourceRun,
  upsertTheme,
} from "./lib/db-seed-helpers.mjs";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

const themeId = "theme_pbc_open_market_demo";
const warningSourceId = "source_pbc_open_market_demo";
const historySourceId = "source_pbc_open_market_history_demo";

try {
  await client.connect();
  await client.query("begin");

  await upsertTheme(client, {
    id: themeId,
    name: "PBOC Open Market Operations",
    themeType: "financial_event",
    infoType: "financial_event",
    description: "Official open market operation announcements from the PBOC",
  });

  await upsertSource(client, {
    id: warningSourceId,
    themeId,
    name: "PBOC Open Market Announcement List",
    sourceType: "page_list",
    adapterKey: "pbc_open_market_announcements",
    status: "active",
    config: {
      path: "/zhengcehuobisi/125207/125213/125431/125475/index.html",
      max_items: 5,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    latestSuccessAt: "2026-05-31T23:00:00Z",
    latestFailureAt: "2026-06-01T06:00:00Z",
  });

  await upsertSource(client, {
    id: historySourceId,
    themeId,
    name: "PBOC Open Market History",
    sourceType: "page_list",
    adapterKey: "pbc_open_market_history",
    status: "active",
    config: {
      path: "/zhengcehuobisi/125207/125213/125431/125475/index.html",
      max_items: 10,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: false,
    },
    latestSuccessAt: "2026-06-01T06:12:00Z",
    latestFailureAt: null,
  });

  await upsertSourceRun(client, {
    id: "run_pbc_open_market_demo_neutral",
    themeId,
    sourceId: historySourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-05-29T23:00:00Z",
    finishedAt: "2026-05-29T23:00:00Z",
  });

  await upsertRawSnapshot(client, {
    id: "snapshot_pbc_open_market_demo_neutral",
    sourceRunId: "run_pbc_open_market_demo_neutral",
    themeId,
    sourceId: historySourceId,
    fetchedAt: "2026-05-29T23:00:00Z",
    payloadJson: {
      announcement_no: "[2026]第84号",
      operation_type: "逆回购",
      amount_billion_cny: 320,
      term_days: 7,
      rate_percent: 1.5,
      direction_label: "neutral",
    },
  });

  await upsertNormalizedRecord(client, {
    id: "record_pbc_open_market_demo_neutral",
    sourceRunId: "run_pbc_open_market_demo_neutral",
    themeId,
    sourceId: historySourceId,
    infoType: "financial_event",
    occurredAt: "2026-05-29T23:00:00Z",
    title: "公开市场操作结构化记录",
    fingerprint: "pbc_open_market_demo_neutral",
    logicalKey: "pbc-open-market-20260529-84",
    content: {
      direction_label: "neutral",
      announcement_no: "[2026]第84号",
      operation_type: "逆回购",
      amount_billion_cny: 320,
      term_days: 7,
      rate_percent: 1.5,
      bidding_method: "固定数量、利率招标",
      direction_reason: "当日投放和到期规模接近，整体偏中性。",
    },
  });

  await upsertSourceRun(client, {
    id: "run_pbc_open_market_demo_injection",
    themeId,
    sourceId: warningSourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-05-31T23:00:00Z",
    finishedAt: "2026-05-31T23:00:00Z",
  });

  await upsertRawSnapshot(client, {
    id: "snapshot_pbc_open_market_demo_injection",
    sourceRunId: "run_pbc_open_market_demo_injection",
    themeId,
    sourceId: warningSourceId,
    fetchedAt: "2026-05-31T23:00:00Z",
    payloadJson: {
      announcement_no: "[2026]第88号",
      operation_type: "逆回购",
      amount_billion_cny: 980,
      term_days: 7,
      rate_percent: 1.4,
      direction_label: "liquidity_injection",
    },
  });

  await upsertNormalizedRecord(client, {
    id: "record_pbc_open_market_demo_injection",
    sourceRunId: "run_pbc_open_market_demo_injection",
    themeId,
    sourceId: warningSourceId,
    infoType: "financial_event",
    occurredAt: "2026-05-31T23:00:00Z",
    title: "公开市场操作结构化记录",
    fingerprint: "pbc_open_market_demo_injection",
    logicalKey: "pbc-open-market-20260531-88",
    content: {
      direction_label: "liquidity_injection",
      announcement_no: "[2026]第88号",
      operation_type: "逆回购",
      amount_billion_cny: 980,
      term_days: 7,
      rate_percent: 1.4,
      bidding_method: "固定利率、数量招标",
      direction_reason: "净投放规模放大，短期流动性信号偏宽松。",
    },
  });

  await upsertChange(client, {
    id: "change_pbc_open_market_demo_injection",
    sourceRunId: "run_pbc_open_market_demo_injection",
    themeId,
    sourceId: warningSourceId,
    normalizedRecordId: "record_pbc_open_market_demo_injection",
    changeType: "updated_record",
    summary: "本轮净投放规模扩大",
    details: {
      title: "[2026]第88号",
      logical_key: "pbc-open-market-20260531-88",
    },
    detectedAt: "2026-05-31T23:01:00Z",
  });

  await upsertEvent(client, {
    id: "event_pbc_open_market_demo_injection",
    sourceRunId: "run_pbc_open_market_demo_injection",
    themeId,
    sourceId: warningSourceId,
    changeId: "change_pbc_open_market_demo_injection",
    eventType: "new_release",
    signal: "liquidity_injection",
    title: "Potential bullish macro event recorded",
    summary: "A macro release was classified as a potentially bullish event.",
    evidence: [
      "Official release captured from a monitored source.",
      "Financial event normalizer produced a structured snapshot.",
      "Direction tag assigned by the current rule set.",
    ],
    status: "tracking",
    isRead: true,
    isBookmarked: false,
    bookmarkedAt: null,
    occurredAt: "2026-05-31T23:02:00Z",
  });

  await upsertEventStatusHistory(client, {
    id: "event_status_history_pbc_open_market_demo_injection",
    eventId: "event_pbc_open_market_demo_injection",
    fromStatus: "open",
    toStatus: "tracking",
    changedAt: "2026-05-31T09:00:00Z",
  });

  await upsertSourceRun(client, {
    id: "run_pbc_open_market_demo_withdrawal",
    themeId,
    sourceId: historySourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-06-01T06:10:00Z",
    finishedAt: "2026-06-01T06:12:00Z",
  });

  await upsertRawSnapshot(client, {
    id: "snapshot_pbc_open_market_demo_withdrawal",
    sourceRunId: "run_pbc_open_market_demo_withdrawal",
    themeId,
    sourceId: historySourceId,
    fetchedAt: "2026-06-01T06:10:00Z",
    payloadJson: {
      announcement_no: "[2026]第91号",
      operation_type: "逆回购",
      amount_billion_cny: 420,
      term_days: 7,
      rate_percent: 1.4,
      direction_label: "liquidity_withdrawal",
    },
  });

  await upsertNormalizedRecord(client, {
    id: "record_pbc_open_market_demo_withdrawal",
    sourceRunId: "run_pbc_open_market_demo_withdrawal",
    themeId,
    sourceId: historySourceId,
    infoType: "financial_event",
    occurredAt: "2026-06-01T06:10:00Z",
    title: "公开市场操作结构化记录",
    fingerprint: "pbc_open_market_demo_withdrawal",
    logicalKey: "pbc-open-market-20260601-91",
    content: {
      direction_label: "liquidity_withdrawal",
      announcement_no: "[2026]第91号",
      operation_type: "逆回购",
      amount_billion_cny: 420,
      term_days: 7,
      rate_percent: 1.4,
      bidding_method: "固定利率、数量招标",
      direction_reason: "净回笼规模大于投放，短期流动性信号偏收紧。",
    },
  });

  await upsertChange(client, {
    id: "change_pbc_open_market_demo_withdrawal",
    sourceRunId: "run_pbc_open_market_demo_withdrawal",
    themeId,
    sourceId: historySourceId,
    normalizedRecordId: "record_pbc_open_market_demo_withdrawal",
    changeType: "updated_record",
    summary: "本轮净回笼规模扩大",
    details: {
      title: "[2026]第91号",
      logical_key: "pbc-open-market-20260601-91",
    },
    detectedAt: "2026-06-01T06:10:30Z",
  });

  await upsertEvent(client, {
    id: "event_pbc_open_market_demo_withdrawal",
    sourceRunId: "run_pbc_open_market_demo_withdrawal",
    themeId,
    sourceId: historySourceId,
    changeId: "change_pbc_open_market_demo_withdrawal",
    eventType: "new_release",
    signal: "liquidity_withdrawal",
    title: "Liquidity withdrawal signal recorded",
    summary: "A new open market operation was classified as a liquidity withdrawal signal.",
    evidence: [
      "Latest PBOC operation list fetched successfully.",
      "Structured financial event snapshot generated from the announcement.",
      "Direction tag assigned as liquidity withdrawal by current rules.",
    ],
    status: "open",
    isRead: false,
    isBookmarked: false,
    bookmarkedAt: null,
    occurredAt: "2026-06-01T06:10:00Z",
  });

  await upsertEventStatusHistory(client, {
    id: "event_status_history_pbc_open_market_demo_withdrawal",
    eventId: "event_pbc_open_market_demo_withdrawal",
    fromStatus: null,
    toStatus: "open",
    changedAt: "2026-06-01T06:10:00Z",
  });

  await client.query("commit");
  console.log("PBOC open market demo theme, sources, records, changes, and events seeded.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed PBOC open market demo.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
