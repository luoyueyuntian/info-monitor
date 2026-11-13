import { isSourceOnboardingStatus } from "@info-monitor/shared-contracts";
import { getDatabase } from "../db/client.js";
import { hasSourcesOnboardingStatusColumn } from "../db/source-schema-compat.js";
import { createId } from "../lib/ids.js";

type SourceInput = {
  themeId: string;
  name: string;
  sourceType: string;
  adapterKey: string;
  config?: Record<string, unknown>;
  onboardingStatus?: "draft" | "ready_to_test" | "active";
};

type SourceUpdateInput = {
  name?: string;
  sourceType?: string;
  adapterKey?: string;
  config?: Record<string, unknown>;
  isPaused?: boolean;
  onboardingStatus?: "draft" | "ready_to_test" | "active";
};

function requireDatabase() {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  return db;
}

function toTimestamp(value?: string | Date | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildSourceAnalysis(input: {
  source: {
    name: string;
    status: string;
    isPaused?: boolean | null;
    latestRunStatus?: string | null;
    latestSuccessAt?: string | Date | null;
    latestFailureAt?: string | Date | null;
    lastErrorMessage?: string | null;
  };
  runs: Array<{ status: string; finishedAt?: string | Date | null; startedAt?: string | Date | null }>;
  events: Array<{ title: string; occurredAt: string | Date; summary: string }>;
}) {
  const warning = input.source.status === "warning" || input.source.latestRunStatus === "failed";
  const latestActivity = Math.max(
    toTimestamp(input.source.latestSuccessAt),
    toTimestamp(input.source.latestFailureAt),
  );
  const stale = latestActivity > 0 && latestActivity < Date.now() - 48 * 60 * 60 * 1000;
  const recentEventCount = input.events.filter((event) => toTimestamp(event.occurredAt) >= Date.now() - 24 * 60 * 60 * 1000).length;

  if (warning) {
    return {
      tone: "warning",
      toneLabel: "需要优先处理",
      headline: "当前来源存在异常，建议先处理抓取链路问题。",
      summary: input.source.lastErrorMessage ?? "最近运行出现失败或异常，当前输出可靠性需要复核。",
      keyPoints: [
        `来源状态：${input.source.status}`,
        `最近运行状态：${input.source.latestRunStatus ?? "暂无"}`,
        recentEventCount > 0 ? `最近24小时仍产生了 ${recentEventCount} 条相关事件。` : "最近24小时没有新的相关事件。",
      ],
      risks: [
        "如果该来源持续失败，主题判断可能会漏掉最新变化。",
        stale ? "该来源超过48小时没有有效更新，当前结论可能滞后。" : "当前需要重点确认失败是否可复现。",
      ],
      actions: [
        "优先查看最近运行记录和错误信息，判断是抓取失败还是解析失败。",
        "修复后手动补跑一次，确认来源恢复正常。",
      ],
    };
  }

  if (input.source.isPaused) {
    return {
      tone: "pending",
      toneLabel: "当前已暂停",
      headline: "来源当前被暂停，信息覆盖可能不完整。",
      summary: "如果该来源仍然有价值，建议确认暂停是否仍然必要。",
      keyPoints: [
        `来源状态：${input.source.status}`,
        `最近运行状态：${input.source.latestRunStatus ?? "暂无"}`,
        recentEventCount > 0 ? `最近24小时历史上产生过 ${recentEventCount} 条相关事件。` : "最近24小时没有新的相关事件。",
      ],
      risks: [
        "暂停状态会让主题长期缺少这一路来源的数据补充。",
        stale ? "同时该来源最近也较久未更新，恢复前建议先确认配置。" : "恢复后建议先补跑再观察。",
      ],
      actions: [
        "先确认暂停原因是否仍然成立。",
        "如需恢复，先恢复来源并手动补跑一次验证结果。",
      ],
    };
  }

  return {
    tone: "healthy",
    toneLabel: "整体稳定",
    headline: "当前来源运行稳定，可继续作为该主题的有效输入。",
    summary: stale ? "来源没有明显报错，但更新时效偏慢，建议留意是否需要补跑。" : "最近运行状态整体正常，当前更适合继续观察其输出质量。",
    keyPoints: [
      `最近运行状态：${input.source.latestRunStatus ?? "暂无"}`,
      recentEventCount > 0 ? `最近24小时产生了 ${recentEventCount} 条相关事件。` : "最近24小时没有新的相关事件。",
      `最近运行记录数：${input.runs.length}`,
    ],
    risks: [
      stale ? "更新时效偏慢，可能导致主题判断滞后。" : "当前未发现明显风险。",
      "即使状态正常，也建议周期性抽查输出内容是否仍然符合预期。",
    ],
    actions: [
      stale ? "手动补跑一次，确认来源是否仍可稳定产出。" : "继续观察后续运行结果，重点关注是否开始出现波动。",
      "如该来源是关键输入，可与同主题其他来源交叉验证。",
    ],
  };
}

export async function listSourceStatuses() {
  const db = requireDatabase();

  const hasOnboardingStatusColumn = await hasSourcesOnboardingStatusColumn(db);

  const baseQuery = db
    .selectFrom("sources as s")
    .innerJoin("themes as t", "t.id", "s.theme_id")
    .select([
      "s.id as id",
      "s.theme_id as themeId",
      "t.name as themeName",
      "t.theme_type as themeType",
      "s.name as name",
      "s.status as status",
      "s.source_type as sourceType",
      "s.adapter_key as adapterKey",
      "s.is_paused as isPaused",
      "s.latest_success_at as latestSuccessAt",
      "s.latest_failure_at as latestFailureAt",
    ])
    .orderBy("s.created_at desc");

  const rows = hasOnboardingStatusColumn
    ? await baseQuery.select("s.onboarding_status as onboardingStatus").execute()
    : await baseQuery.execute();

  const sourceIds = rows.map((row) => row.id);
  const themeIds = [...new Set(rows.map((row) => row.themeId))];
  const [eventRows, runRows] = rows.length ? await Promise.all([
    db.selectFrom("events").distinctOn("theme_id")
      .select(["theme_id as themeId", "signal as latestEventSignal"])
      .where("theme_id", "in", themeIds)
      .orderBy("theme_id").orderBy("occurred_at", "desc").orderBy("id", "desc").execute(),
    // One indexed lookup per source inside a single query, avoiding sorting run history.
    db.selectFrom("sources as lookup")
      .leftJoinLateral((eb) => eb.selectFrom("source_runs as sr")
        .select(["sr.status", "sr.finished_at", "sr.started_at", "sr.error_message"])
        .whereRef("sr.source_id", "=", "lookup.id")
        .where("sr.trigger_type", "not in", ["test", "replay"])
        .orderBy("sr.created_at", "desc").orderBy("sr.id", "desc").limit(1).as("latest_run"),
      (join) => join.onTrue())
      .select(["lookup.id as sourceId", "latest_run.status as latestRunStatus", "latest_run.finished_at as finishedAt", "latest_run.started_at as startedAt", "latest_run.error_message as lastErrorMessage"])
      .where("lookup.id", "in", sourceIds).execute(),
  ]) : [[], []];
  const latestEvents = new Map(eventRows.map((row) => [row.themeId, row]));
  const latestRuns = new Map(runRows.map((row) => [row.sourceId, row]));

  return rows.map((row) => {
    const latestRun = latestRuns.get(row.id);
    const latestEvent = latestEvents.get(row.themeId);

    return {
      ...row,
      onboardingStatus:
        ("onboardingStatus" in row && isSourceOnboardingStatus(row.onboardingStatus) ? row.onboardingStatus : (row.isPaused ? "draft" : "active")),
      latestEventSignal: latestEvent?.latestEventSignal ?? null,
      latestSuccessAt: row.latestSuccessAt?.toISOString?.() ?? null,
      latestFailureAt: row.latestFailureAt?.toISOString?.() ?? null,
      latestRunStatus: latestRun?.latestRunStatus ?? null,
      latestRunAt: latestRun?.finishedAt?.toISOString?.() ?? latestRun?.startedAt?.toISOString?.() ?? null,
      lastErrorMessage: latestRun?.lastErrorMessage ?? null,
    };
  });
}

export async function getSourceDetail(sourceId: string) {
  const db = requireDatabase();

  const hasOnboardingStatusColumn = await hasSourcesOnboardingStatusColumn(db);

  const baseSourceQuery = db
    .selectFrom("sources as s")
    .innerJoin("themes as t", "t.id", "s.theme_id")
    .select([
      "s.id as id",
      "s.theme_id as themeId",
      "t.name as themeName",
      "t.theme_type as themeType",
      "s.name as name",
      "s.status as status",
      "s.source_type as sourceType",
      "s.adapter_key as adapterKey",
      "s.config as config",
      "s.is_paused as isPaused",
      "s.latest_success_at as latestSuccessAt",
      "s.latest_failure_at as latestFailureAt",
    ])
    .where("s.id", "=", sourceId);

  const source = hasOnboardingStatusColumn
    ? await baseSourceQuery.select("s.onboarding_status as onboardingStatus").executeTakeFirst()
    : await baseSourceQuery.executeTakeFirst();

  if (!source) {
    return null;
  }

  // All runs for display (including test)
  const runs = await db
    .selectFrom("source_runs")
    .select([
      "id",
      "status",
      "trigger_type as triggerType",
      "config_version as configVersion",
      "started_at as startedAt",
      "finished_at as finishedAt",
      "error_message as errorMessage",
    ])
    .where("source_id", "=", sourceId)
    .orderBy("created_at desc")
    .limit(10)
    .execute();

  // Latest production run for source-level health fields (exclude test and replay)
  const latestProdRun = await db
    .selectFrom("source_runs")
    .select(["status", "finished_at as finishedAt", "started_at as startedAt", "error_message as errorMessage"])
    .where("source_id", "=", sourceId)
    .where("trigger_type", "not in", ["test", "replay"])
    .orderBy("created_at desc")
    .limit(1)
    .executeTakeFirst();

  // Per-run counts for snapshots, records, changes, events
  const runIds = runs.map((run) => run.id);
  const snapshotCounts = new Map<string, number>();
  const recordCounts = new Map<string, number>();
  const changeCounts = new Map<string, number>();
  const eventCounts = new Map<string, number>();

  if (runIds.length > 0) {
    const [snapCounts, recCounts, chgCounts, evtCounts] = await Promise.all([
      db.selectFrom("raw_snapshots")
        .select(["source_run_id as runId", ({ fn }) => fn.count("id").as("count")])
        .where("source_run_id", "in", runIds)
        .groupBy("source_run_id")
        .execute(),
      db.selectFrom("normalized_records")
        .select(["source_run_id as runId", ({ fn }) => fn.count("id").as("count")])
        .where("source_run_id", "in", runIds)
        .groupBy("source_run_id")
        .execute(),
      db.selectFrom("changes")
        .select(["source_run_id as runId", ({ fn }) => fn.count("id").as("count")])
        .where("source_run_id", "in", runIds)
        .groupBy("source_run_id")
        .execute(),
      db.selectFrom("events")
        .select(["source_run_id as runId", ({ fn }) => fn.count("id").as("count")])
        .where("source_run_id", "in", runIds)
        .groupBy("source_run_id")
        .execute(),
    ]);

    for (const row of snapCounts) snapshotCounts.set(row.runId, Number(row.count));
    for (const row of recCounts) recordCounts.set(row.runId, Number(row.count));
    for (const row of chgCounts) changeCounts.set(row.runId, Number(row.count));
    for (const row of evtCounts) eventCounts.set(row.runId, Number(row.count));
  }

  const latestThemeEvent = await db
    .selectFrom("events")
    .select(["signal"])
    .where("theme_id", "=", source.themeId)
    .orderBy("occurred_at desc")
    .limit(1)
    .executeTakeFirst();

  const events = await db
    .selectFrom("events")
    .select([
      "id",
      "title",
      "signal",
      "status",
      "is_read as isRead",
      "is_bookmarked as isBookmarked",
      "occurred_at as occurredAt",
      "summary",
    ])
    .where("source_id", "=", sourceId)
    .orderBy("occurred_at desc")
    .limit(10)
    .execute();

  const records = await db
    .selectFrom("normalized_records")
    .select(["id", "title", "occurred_at as occurredAt", "info_type as infoType", "content"])
    .where("source_id", "=", sourceId)
    .orderBy("occurred_at desc")
    .limit(10)
    .execute();

  const changes = await db
    .selectFrom("changes")
    .select(["id", "change_type as changeType", "summary", "detected_at as detectedAt", "details"])
    .where("source_id", "=", sourceId)
    .orderBy("detected_at desc")
    .limit(10)
    .execute();

  const snapshots = await db
    .selectFrom("raw_snapshots as rs")
    .innerJoin("source_runs as sr", "sr.id", "rs.source_run_id")
    .select([
      "rs.id as id",
      "rs.source_run_id as sourceRunId",
      "rs.fetched_at as fetchedAt",
      "rs.storage_path as storagePath",
      "rs.payload_json as payloadJson",
      "sr.trigger_type as triggerType",
    ])
    .where("rs.source_id", "=", sourceId)
    .orderBy("rs.fetched_at desc")
    .limit(5)
    .execute();

  const normalizedSource = {
    ...source,
    onboardingStatus:
      ("onboardingStatus" in source ? source.onboardingStatus : undefined) ??
      (source.isPaused ? "draft" : "active"),
    latestEventSignal: latestThemeEvent?.signal ?? null,
    latestSuccessAt: source.latestSuccessAt?.toISOString?.() ?? null,
    latestFailureAt: source.latestFailureAt?.toISOString?.() ?? null,
    latestRunStatus: latestProdRun?.status ?? null,
    latestRunAt:
      latestProdRun?.finishedAt?.toISOString?.() ??
      latestProdRun?.startedAt?.toISOString?.() ??
      null,
    lastErrorMessage: latestProdRun?.errorMessage ?? null,
  };
  const normalizedRuns = runs.map((run) => ({
    ...run,
    startedAt: run.startedAt?.toISOString?.() ?? null,
    finishedAt: run.finishedAt?.toISOString?.() ?? null,
    snapshotCount: snapshotCounts.get(run.id) ?? 0,
    recordCount: recordCounts.get(run.id) ?? 0,
    changeCount: changeCounts.get(run.id) ?? 0,
    eventCount: eventCounts.get(run.id) ?? 0,
  }));
  const normalizedEvents = events.map((event) => ({
    ...event,
    occurredAt: event.occurredAt.toISOString?.() ?? event.occurredAt,
  }));
  const normalizedRecords = records.map((record) => ({
    ...record,
    occurredAt: record.occurredAt.toISOString?.() ?? record.occurredAt,
  }));
  const normalizedChanges = changes.map((change) => ({
    ...change,
    detectedAt: change.detectedAt.toISOString?.() ?? change.detectedAt,
  }));
  const normalizedSnapshots = snapshots.map((snapshot) => ({
    id: snapshot.id,
    sourceRunId: snapshot.sourceRunId,
    fetchedAt: snapshot.fetchedAt.toISOString?.() ?? snapshot.fetchedAt,
    storagePath: snapshot.storagePath,
    payloadPreview: JSON.stringify(snapshot.payloadJson ?? {}, null, 2),
    triggerType: snapshot.triggerType ?? "manual",
  }));

  return {
    source: normalizedSource,
    runs: normalizedRuns,
    events: normalizedEvents,
    records: normalizedRecords,
    changes: normalizedChanges,
    snapshots: normalizedSnapshots,
    analysis: buildSourceAnalysis({
      source: normalizedSource,
      runs: normalizedRuns,
      events: normalizedEvents,
    }),
  };
}

// ─── Source Preset Registry ─────────────────────────────────────────────────

export type SourcePresetField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
  placeholder?: string;
  required?: boolean;
};

export type SourcePreset = {
  id: string;
  label: string;
  description: string;
  sourceType: string;
  adapterKey: string;
  infoType: string;
  fields: SourcePresetField[];
  defaultConfig: Record<string, string | number | boolean>;
  help?: string;
};

export const sourcePresets: SourcePreset[] = [
  {
    id: "demo-price-feed",
    label: "Demo Price Feed",
    description: "Local demo price feed for validating the monitoring pipeline.",
    sourceType: "page_list",
    adapterKey: "demo_price_feed",
    infoType: "commodity_price",
    fields: [
      { key: "file_path", label: "File Path", type: "text", placeholder: "apps/python-worker/examples/surface-pro-8-price-feed.json", required: true },
    ],
    defaultConfig: { file_path: "apps/python-worker/examples/surface-pro-8-price-feed.json" },
    help: "Use this for smoke tests before connecting a live source.",
  },
  {
    id: "eastmoney-price",
    label: "Eastmoney Daily Price",
    description: "Eastmoney historical kline data for stock-like price monitoring.",
    sourceType: "api",
    adapterKey: "eastmoney_stock_kline",
    infoType: "stock_price",
    fields: [
      { key: "secid", label: "Security ID", type: "text", placeholder: "1.600519", required: true },
      { key: "days", label: "Lookback Days", type: "number", placeholder: "45" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "86400" },
      { key: "run_after_time_local", label: "Run After Local Time", type: "text", placeholder: "16:10" },
      { key: "schedule_timezone", label: "Schedule Timezone", type: "text", placeholder: "+08:00" },
      { key: "run_weekdays_only", label: "Weekdays Only", type: "boolean" },
      { key: "holiday_calendar", label: "Holiday Calendar", type: "text", placeholder: "cn_stock_2026" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      secid: "1.600519",
      days: 45,
      schedule_interval_seconds: 86400,
      run_after_time_local: "16:10",
      schedule_timezone: "+08:00",
      run_weekdays_only: true,
      holiday_calendar: "cn_stock_2026",
      emit_events_on_latest_only: true,
    },
    help: "Use `1.600519` for Shanghai-listed Kweichow Moutai. Stock-market sources default to running after the local close on weekdays only, and skip the built-in China market holiday calendar.",
  },
  {
    id: "eastmoney-market-overview",
    label: "China / Hong Kong Market Overview",
    description: "Daily A-share / Hong Kong close snapshot with northbound and southbound flow.",
    sourceType: "api",
    adapterKey: "eastmoney_market_overview",
    infoType: "financial_event",
    fields: [
      { key: "include_a_share", label: "Include A-share", type: "boolean" },
      { key: "include_hk", label: "Include Hong Kong", type: "boolean" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "86400" },
      { key: "run_after_time_local", label: "Run After Local Time", type: "text", placeholder: "16:10" },
      { key: "schedule_timezone", label: "Schedule Timezone", type: "text", placeholder: "+08:00" },
      { key: "run_weekdays_only", label: "Weekdays Only", type: "boolean" },
      { key: "holiday_calendar", label: "Holiday Calendar", type: "text", placeholder: "cn_stock_2026" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      include_a_share: true,
      include_hk: true,
      schedule_interval_seconds: 86400,
      run_after_time_local: "16:10",
      schedule_timezone: "+08:00",
      run_weekdays_only: true,
      holiday_calendar: "cn_stock_2026",
      emit_events_on_latest_only: false,
    },
    help: "Best for a daily market-close snapshot theme covering A-shares, Hong Kong, and cross-border flow. It auto-runs after the configured local close time on weekdays only, and skips the built-in China market holiday calendar.",
  },
  {
    id: "eastmoney-daily-billboard",
    label: "Eastmoney Dragon Tiger List",
    description: "Track daily 龙虎榜上榜个股、净买额和强弱异动线索。",
    sourceType: "api",
    adapterKey: "eastmoney_daily_billboard",
    infoType: "financial_event",
    fields: [
      { key: "page_size", label: "Page Size", type: "number", placeholder: "20" },
      { key: "days", label: "Lookback Days", type: "number", placeholder: "1" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "86400" },
      { key: "run_after_time_local", label: "Run After Local Time", type: "text", placeholder: "16:20" },
      { key: "schedule_timezone", label: "Schedule Timezone", type: "text", placeholder: "+08:00" },
      { key: "run_weekdays_only", label: "Weekdays Only", type: "boolean" },
      { key: "holiday_calendar", label: "Holiday Calendar", type: "text", placeholder: "cn_stock_2026" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      page_size: 20,
      days: 1,
      schedule_interval_seconds: 86400,
      run_after_time_local: "16:20",
      schedule_timezone: "+08:00",
      run_weekdays_only: true,
      holiday_calendar: "cn_stock_2026",
      emit_events_on_latest_only: true,
    },
    help: "适合盘后抓取龙虎榜异动，增强个股异动归因。",
  },
  {
    id: "pbc-news",
    label: "PBOC News Releases",
    description: "Official news from the People's Bank of China.",
    sourceType: "page_list",
    adapterKey: "pbc_news_list",
    infoType: "news_announcement",
    fields: [
      { key: "path", label: "List Path", type: "text", placeholder: "/goutongjiaoliu/113456/113469/index.html", required: true },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { path: "/goutongjiaoliu/113456/113469/index.html", schedule_interval_seconds: 21600, emit_events_on_latest_only: true },
  },
  {
    id: "pbc-open-market",
    label: "PBOC Open Market",
    description: "Structured open market operation announcements from the PBOC.",
    sourceType: "page_list",
    adapterKey: "pbc_open_market_announcements",
    infoType: "financial_event",
    fields: [
      { key: "path", label: "List Path", type: "text", placeholder: "/zhengcehuobisi/125207/125213/125431/125475/index.html", required: true },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "5" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { path: "/zhengcehuobisi/125207/125213/125431/125475/index.html", max_items: 5, schedule_interval_seconds: 21600, emit_events_on_latest_only: true },
  },
  {
    id: "content-update-page",
    label: "Product Update Feed",
    description: "Track feature releases, changelog entries, or product updates.",
    sourceType: "page_list",
    adapterKey: "generic_content_update_list",
    infoType: "content_update",
    fields: [
      { key: "url", label: "Page URL", type: "text", placeholder: "https://example.com/releases", required: true },
      { key: "item_selector", label: "Item Selector", type: "text", placeholder: ".release-item", required: true },
      { key: "title_selector", label: "Title Selector", type: "text", placeholder: "h2 a" },
      { key: "link_selector", label: "Link Selector", type: "text", placeholder: "h2 a" },
      { key: "time_selector", label: "Time Selector", type: "text", placeholder: "time" },
      { key: "update_type", label: "Update Type", type: "text", placeholder: "feature_release" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { schedule_interval_seconds: 21600, emit_events_on_latest_only: true },
    help: "Use CSS selectors to extract update cards from a release-note page.",
  },
  {
    id: "generic-price-list",
    label: "Second-Hand Price API",
    description: "Monitor prices from a JSON API endpoint (second-hand marketplaces, price aggregators, etc.).",
    sourceType: "api",
    adapterKey: "generic_price_list",
    infoType: "commodity_price",
    fields: [
      { key: "url", label: "API URL", type: "text", placeholder: "https://api.example.com/prices", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "data.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "price_field", label: "Price Field", type: "text", placeholder: "price", required: true },
      { key: "spec_field", label: "Spec Field", type: "text", placeholder: "spec" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "created_at" },
      { key: "currency", label: "Currency", type: "text", placeholder: "CNY" },
      { key: "symbol_field", label: "Symbol Field", type: "text", placeholder: "symbol" },
      { key: "include_title_keywords", label: "Include Title Keywords", type: "text", placeholder: "iphone,ipad" },
      { key: "exclude_title_keywords", label: "Exclude Title Keywords", type: "text", placeholder: "黄金,基金,金条,纪念币" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      currency: "CNY",
      max_items: 20,
      exclude_title_keywords: "黄金,白银,金条,金币,纪念币,基金,ETF,股票,债券,期货,外汇,比特币,投资,理财",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "Works with any JSON API returning a list of price items. Use dot notation for nested fields (e.g. 'data.items'). Exclude keywords can keep investment products out of goods-price themes.",
  },
  {
    id: "generic-html-price-list",
    label: "HTML Price List Page",
    description: "Monitor prices from a public HTML list page using CSS selectors.",
    sourceType: "page_list",
    adapterKey: "generic_html_price_list",
    infoType: "commodity_price",
    fields: [
      { key: "url", label: "Page URL", type: "text", placeholder: "https://example.com/deals", required: true },
      { key: "item_selector", label: "Item Selector", type: "text", placeholder: ".deal-card", required: true },
      { key: "title_selector", label: "Title Selector", type: "text", placeholder: ".deal-title", required: true },
      { key: "price_selector", label: "Price Selector", type: "text", placeholder: ".deal-price", required: true },
      { key: "link_selector", label: "Link Selector", type: "text", placeholder: ".deal-title a" },
      { key: "time_selector", label: "Time Selector", type: "text", placeholder: "time" },
      { key: "spec_selector", label: "Spec Selector", type: "text", placeholder: ".deal-spec" },
      { key: "currency", label: "Currency", type: "text", placeholder: "CNY" },
      { key: "include_title_keywords", label: "Include Title Keywords", type: "text", placeholder: "iphone,ipad" },
      { key: "exclude_title_keywords", label: "Exclude Title Keywords", type: "text", placeholder: "黄金,基金,金条,纪念币" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      currency: "CNY",
      max_items: 20,
      exclude_title_keywords: "黄金,白银,金条,金币,纪念币,基金,ETF,股票,债券,期货,外汇,比特币,投资,理财",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "Use CSS selectors to read price cards from a list page. Best for public deal pages or your own mirrored pages.",
  },
  {
    id: "smzdm-deals-page",
    label: "SMZDM Deals Page",
    description: "Track deal-list prices from 什么值得买. Direct access may require a proxy because the site can trigger anti-bot checks.",
    sourceType: "page_list",
    adapterKey: "generic_html_price_list",
    infoType: "commodity_price",
    fields: [
      { key: "url", label: "Page URL", type: "text", placeholder: "https://www.smzdm.com/fenlei/diannaozhengji/", required: true },
      { key: "item_selector", label: "Item Selector", type: "text", placeholder: ".side-jx-r", required: true },
      { key: "title_selector", label: "Title Selector", type: "text", placeholder: ".side-line-title", required: true },
      { key: "price_selector", label: "Price Selector", type: "text", placeholder: ".side-price", required: true },
      { key: "link_selector", label: "Link Selector", type: "text", placeholder: "a.side-line-title" },
      { key: "time_selector", label: "Time Selector", type: "text", placeholder: "time" },
      { key: "include_title_keywords", label: "Include Title Keywords", type: "text", placeholder: "iphone,ipad" },
      { key: "exclude_title_keywords", label: "Exclude Title Keywords", type: "text", placeholder: "黄金,基金,金条,纪念币" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      url: "https://www.smzdm.com/fenlei/diannaozhengji/",
      item_selector: ".side-jx-r",
      title_selector: ".side-line-title",
      price_selector: ".side-price",
      link_selector: "a.side-line-title",
      exclude_title_keywords: "黄金,白银,金条,金币,纪念币,基金,ETF,股票,债券,期货,外汇,比特币,投资,理财",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "什么值得买频道/搜索页可能触发验证码，建议优先通过自有代理、快照页或可控镜像来接入。",
  },
  {
    id: "taobao-proxy-price-api",
    label: "Taobao Proxy Price API",
    description: "Use your own proxy/API to ingest Taobao search or item prices. Direct official page scraping is usually unstable.",
    sourceType: "api",
    adapterKey: "generic_price_list",
    infoType: "commodity_price",
    fields: [
      { key: "url", label: "Proxy API URL", type: "text", placeholder: "https://proxy.example.com/api/taobao/search", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "data.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "price_field", label: "Price Field", type: "text", placeholder: "price", required: true },
      { key: "spec_field", label: "Spec Field", type: "text", placeholder: "spec" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "occurred_at" },
      { key: "include_title_keywords", label: "Include Title Keywords", type: "text", placeholder: "iphone,ipad" },
      { key: "exclude_title_keywords", label: "Exclude Title Keywords", type: "text", placeholder: "黄金,基金,金条,纪念币" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      items_field: "data.items",
      title_field: "title",
      price_field: "price",
      exclude_title_keywords: "黄金,白银,金条,金币,纪念币,基金,ETF,股票,债券,期货,外汇,比特币,投资,理财",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "淘宝官方搜索页通常有强反爬，建议只接自有代理/API，不建议把官方搜索 URL 直接填进来。",
  },
  {
    id: "jd-proxy-price-api",
    label: "JD Proxy Price API",
    description: "Use your own proxy/API to ingest JD search or item prices. Direct official page scraping is usually unstable.",
    sourceType: "api",
    adapterKey: "generic_price_list",
    infoType: "commodity_price",
    fields: [
      { key: "url", label: "Proxy API URL", type: "text", placeholder: "https://proxy.example.com/api/jd/search", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "data.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "price_field", label: "Price Field", type: "text", placeholder: "price", required: true },
      { key: "spec_field", label: "Spec Field", type: "text", placeholder: "spec" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "occurred_at" },
      { key: "include_title_keywords", label: "Include Title Keywords", type: "text", placeholder: "iphone,ipad" },
      { key: "exclude_title_keywords", label: "Exclude Title Keywords", type: "text", placeholder: "黄金,基金,金条,纪念币" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      items_field: "data.items",
      title_field: "title",
      price_field: "price",
      exclude_title_keywords: "黄金,白银,金条,金币,纪念币,基金,ETF,股票,债券,期货,外汇,比特币,投资,理财",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "JD 搜索页通常会跳转风险校验页，建议只接自有代理/API，不建议直连官方搜索页。",
  },
  {
    id: "pdd-proxy-price-api",
    label: "PDD Proxy Price API",
    description: "Use your own proxy/API to ingest Pinduoduo search or item prices. Direct official page scraping is usually unstable.",
    sourceType: "api",
    adapterKey: "generic_price_list",
    infoType: "commodity_price",
    fields: [
      { key: "url", label: "Proxy API URL", type: "text", placeholder: "https://proxy.example.com/api/pdd/search", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "data.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "price_field", label: "Price Field", type: "text", placeholder: "price", required: true },
      { key: "spec_field", label: "Spec Field", type: "text", placeholder: "spec" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "occurred_at" },
      { key: "include_title_keywords", label: "Include Title Keywords", type: "text", placeholder: "iphone,ipad" },
      { key: "exclude_title_keywords", label: "Exclude Title Keywords", type: "text", placeholder: "黄金,基金,金条,纪念币" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      items_field: "data.items",
      title_field: "title",
      price_field: "price",
      exclude_title_keywords: "黄金,白银,金条,金币,纪念币,基金,ETF,股票,债券,期货,外汇,比特币,投资,理财",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "拼多多公开页很容易返回空白或受限响应，建议通过自有代理/API 接入。",
  },
  {
    id: "generic-announcement-list",
    label: "Product Announcement API",
    description: "Monitor product updates, changelogs, or announcements from a JSON API.",
    sourceType: "api",
    adapterKey: "generic_announcement_list",
    infoType: "content_update",
    fields: [
      { key: "url", label: "API URL", type: "text", placeholder: "https://api.example.com/announcements", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "data.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "published_at" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "description" },
      { key: "category_field", label: "Category Field", type: "text", placeholder: "category" },
      { key: "object_name", label: "Product Name", type: "text", placeholder: "My Product" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: { title_field: "title", max_items: 20, schedule_interval_seconds: 21600, emit_events_on_latest_only: true },
    help: "Works with any JSON API returning announcements. Category field auto-classifies as feature_release, marketing, or announcement.",
  },
  {
    id: "generic-news-announcement-list",
    label: "Official Announcement API",
    description: "Monitor official or exchange announcements from a JSON API or proxy feed.",
    sourceType: "api",
    adapterKey: "generic_news_announcement_list",
    infoType: "news_announcement",
    fields: [
      { key: "url", label: "API URL", type: "text", placeholder: "https://proxy.example.com/api/notices", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "result.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "published_at" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "publisher", label: "Publisher", type: "text", placeholder: "上海证券交易所" },
      { key: "publisher_field", label: "Publisher Field", type: "text", placeholder: "publisher" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "summary" },
      { key: "category", label: "Category", type: "text", placeholder: "exchange_announcement" },
      { key: "category_field", label: "Category Field", type: "text", placeholder: "category" },
      { key: "release_topic", label: "Release Topic", type: "text", placeholder: "listed_company_announcement" },
      { key: "release_topic_label", label: "Release Topic Label", type: "text", placeholder: "上市公司公告" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      title_field: "title",
      category: "exchange_announcement",
      release_topic: "listed_company_announcement",
      release_topic_label: "上市公司公告",
      max_items: 20,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "适合接官方公告代理、交易所公告 API 或你自己的公告聚合服务。",
  },
  {
    id: "sse-announcements-proxy",
    label: "SSE Announcements Proxy",
    description: "Track 上交所上市公司公告 through a JSON proxy/API feed.",
    sourceType: "api",
    adapterKey: "generic_news_announcement_list",
    infoType: "news_announcement",
    fields: [
      { key: "url", label: "Proxy API URL", type: "text", placeholder: "https://proxy.example.com/api/sse/announcements", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "result.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "date" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "summary" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      items_field: "result.items",
      title_field: "title",
      time_field: "date",
      url_field: "url",
      publisher: "上海证券交易所",
      category: "exchange_announcement",
      release_topic: "listed_company_announcement",
      release_topic_label: "上交所公告",
      max_items: 20,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "上交所官方页面可访问，但真实列表查询参数较细，建议优先通过自有代理/API 稳定接入。",
  },
  {
    id: "szse-announcements-proxy",
    label: "SZSE Announcements Proxy",
    description: "Track 深交所上市公司公告 through a JSON proxy/API feed.",
    sourceType: "api",
    adapterKey: "generic_news_announcement_list",
    infoType: "news_announcement",
    fields: [
      { key: "url", label: "Proxy API URL", type: "text", placeholder: "https://proxy.example.com/api/szse/announcements", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "result.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "date" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "summary" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      items_field: "result.items",
      title_field: "title",
      time_field: "date",
      url_field: "url",
      publisher: "深圳证券交易所",
      category: "exchange_announcement",
      release_topic: "listed_company_announcement",
      release_topic_label: "深交所公告",
      max_items: 20,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "深交所公告官方页前端脚本较重，建议优先通过自有代理/API 稳定接入。",
  },
  {
    id: "hkex-announcements-proxy",
    label: "HKEX Announcements Proxy",
    description: "Track 港交所披露 through a JSON proxy/API feed.",
    sourceType: "api",
    adapterKey: "generic_news_announcement_list",
    infoType: "news_announcement",
    fields: [
      { key: "url", label: "Proxy API URL", type: "text", placeholder: "https://proxy.example.com/api/hkex/announcements", required: true },
      { key: "items_field", label: "Items Field (dot notation)", type: "text", placeholder: "result.items" },
      { key: "title_field", label: "Title Field", type: "text", placeholder: "title", required: true },
      { key: "time_field", label: "Time Field", type: "text", placeholder: "date" },
      { key: "url_field", label: "URL Field", type: "text", placeholder: "url" },
      { key: "summary_field", label: "Summary Field", type: "text", placeholder: "summary" },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      items_field: "result.items",
      title_field: "title",
      time_field: "date",
      url_field: "url",
      publisher: "香港交易所",
      category: "exchange_announcement",
      release_topic: "listed_company_announcement",
      release_topic_label: "港交所公告",
      max_items: 20,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    help: "港交所搜索页当前直连不稳定，建议优先通过自有代理/API 接入。",
  },
  {
    id: "sina-gold-price",
    label: "Sina Gold / Precious Metal Price",
    description: "Real-time international gold, silver, and precious metal prices via Sina Finance.",
    sourceType: "api",
    adapterKey: "sina_gold_price",
    infoType: "stock_price",
    fields: [
      { key: "symbols", label: "Symbols (comma-separated)", type: "text", placeholder: "hf_GC,hf_XAU", required: true },
      { key: "currency", label: "Currency", type: "text", placeholder: "USD" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "3600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      symbols: "hf_GC",
      currency: "USD",
      schedule_interval_seconds: 3600,
      emit_events_on_latest_only: true,
    },
    help: "hf_GC=COMEX Gold, hf_XAU=Spot Gold, hf_XAG=Spot Silver, hf_CL=WTI Crude. Uses Sina Finance HQ API.",
  },
  {
    id: "sina-a-share-price",
    label: "Sina A-Share Price",
    description: "Real-time A-share stock prices via Sina Finance.",
    sourceType: "api",
    adapterKey: "sina_stock_price",
    infoType: "stock_price",
    fields: [
      { key: "symbols", label: "Symbols (comma-separated)", type: "text", placeholder: "sh600519,sz000858", required: true },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "300" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      symbols: "sh600519",
      schedule_interval_seconds: 300,
      emit_events_on_latest_only: true,
    },
    help: "sh prefix for Shanghai, sz prefix for Shenzhen. Example: sh600519 (贵州茅台).",
  },
  {
    id: "sina-hk-stock-price",
    label: "Sina Hong Kong Stock Price",
    description: "Real-time Hong Kong stock prices via Sina Finance.",
    sourceType: "api",
    adapterKey: "sina_stock_price",
    infoType: "stock_price",
    fields: [
      { key: "symbols", label: "Symbols (comma-separated)", type: "text", placeholder: "rt_hk00700,rt_hk09988", required: true },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "300" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      symbols: "rt_hk00700",
      schedule_interval_seconds: 300,
      emit_events_on_latest_only: true,
    },
    help: "rt_hk prefix for Hong Kong stocks. Example: rt_hk00700 (腾讯控股).",
  },
  {
    id: "sina-global-index",
    label: "Sina Global Stock Index",
    description: "International stock indices (S&P 500, NASDAQ, Dow Jones, etc.) via Sina Finance.",
    sourceType: "api",
    adapterKey: "yahoo_finance_price",
    infoType: "stock_price",
    fields: [
      { key: "symbol", label: "Symbol", type: "text", placeholder: "gb_inx", required: true },
      { key: "currency", label: "Currency", type: "text", placeholder: "USD" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "3600" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      symbol: "gb_inx",
      currency: "USD",
      schedule_interval_seconds: 3600,
      emit_events_on_latest_only: true,
    },
    help: "gb_inx=S&P 500, gb_dji=Dow Jones, gb_ixic=NASDAQ, gb_ftse=FTSE 100, gb_dax=DAX. Also accepts Yahoo symbols like ^GSPC.",
  },
  {
    id: "github-releases",
    label: "GitHub Releases",
    description: "Monitor releases of any public GitHub repository.",
    sourceType: "api",
    adapterKey: "github_releases",
    infoType: "content_update",
    fields: [
      { key: "owner", label: "Repository Owner", type: "text", placeholder: "vuejs", required: true },
      { key: "repo", label: "Repository Name", type: "text", placeholder: "core", required: true },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "10" },
      { key: "include_prerelease", label: "Include Pre-releases", type: "boolean" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "3600" },
    ],
    defaultConfig: {
      owner: "vuejs",
      repo: "core",
      max_items: 10,
      include_prerelease: false,
      schedule_interval_seconds: 3600,
    },
    help: "Monitor any public GitHub repo for new releases, version bumps, and changelog updates.",
  },
  {
    id: "rss-feed",
    label: "RSS / Atom Feed",
    description: "Universal RSS 2.0 or Atom feed monitor for blogs, news, and product updates.",
    sourceType: "api",
    adapterKey: "rss_feed",
    infoType: "news_announcement",
    fields: [
      { key: "url", label: "Feed URL", type: "text", placeholder: "https://hnrss.org/frontpage", required: true },
      { key: "max_items", label: "Max Items", type: "number", placeholder: "20" },
      { key: "category", label: "Category", type: "text", placeholder: "news_announcement" },
      { key: "publisher", label: "Publisher", type: "text", placeholder: "Hacker News" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "1800" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      url: "https://hnrss.org/frontpage",
      max_items: 20,
      category: "news_announcement",
      schedule_interval_seconds: 1800,
      emit_events_on_latest_only: true,
    },
    help: "Works with any standard RSS 2.0 or Atom feed. Examples: Hacker News, official blogs, product changelogs.",
  },
  {
    id: "ndrc-announcements",
    label: "NDRC Announcements",
    description: "National Development and Reform Commission price guidance and policy announcements.",
    sourceType: "page_list",
    adapterKey: "ndrc_announcements",
    infoType: "financial_event",
    fields: [
      { key: "max_items", label: "Max Items", type: "number", placeholder: "10" },
      { key: "url", label: "List URL", type: "text", placeholder: "https://www.ndrc.gov.cn/xxgk/zcfb/tz/index.html" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "7200" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      max_items: 10,
      schedule_interval_seconds: 7200,
      emit_events_on_latest_only: true,
    },
    help: "Tracks NDRC official announcements about commodity prices, energy policy, and macro guidance.",
  },
  {
    id: "csrc-announcements",
    label: "CSRC Announcements",
    description: "China Securities Regulatory Commission regulatory announcements.",
    sourceType: "page_list",
    adapterKey: "csrc_announcements",
    infoType: "financial_event",
    fields: [
      { key: "max_items", label: "Max Items", type: "number", placeholder: "10" },
      { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "7200" },
      { key: "emit_events_on_latest_only", label: "Latest only", type: "boolean" },
    ],
    defaultConfig: {
      max_items: 10,
      schedule_interval_seconds: 7200,
      emit_events_on_latest_only: true,
    },
    help: "Tracks CSRC regulatory notices, IPO approvals, and market supervision announcements.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Manual configuration for a new adapter or custom config shape.",
    sourceType: "page_list",
    adapterKey: "",
    infoType: "price",
    fields: [],
    defaultConfig: {},
    help: "Use this when experimenting beyond the built-in presets.",
  },
];

export function getSourcePresetById(presetId: string): SourcePreset | undefined {
  return sourcePresets.find((p) => p.id === presetId);
}

export type SourceValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  presetId?: string;
};

const adapterRequiredConfigKeys: Record<string, string[]> = {
  generic_content_update_list: ["url", "item_selector", "title_selector"],
  generic_announcement_list: ["url"],
  generic_news_announcement_list: ["url"],
  generic_price_list: ["url"],
  generic_html_price_list: ["url", "item_selector", "title_selector", "price_selector"],
};

function appendMissingRequiredConfigErrors(
  errors: string[],
  adapterKey: string | undefined,
  config: Record<string, unknown>,
) {
  if (!adapterKey) {
    return;
  }

  for (const key of adapterRequiredConfigKeys[adapterKey] ?? []) {
    const value = config[key];
    if (value === undefined || value === null || value === "") {
      const message = `Missing required field: ${key}`;
      if (!errors.includes(message)) {
        errors.push(message);
      }
    }
  }
}

export function validateSourceConfig(input: {
  presetId?: string;
  adapterKey?: string;
  sourceType?: string;
  config?: Record<string, unknown>;
  name?: string;
}): SourceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const directRetailDomains = ["smzdm.com", "jd.com", "taobao.com", "tmall.com", "yangkeduo.com", "pinduoduo.com"];

  // Resolve preset
  let preset: SourcePreset | undefined;
  if (input.presetId) {
    preset = getSourcePresetById(input.presetId);
    if (!preset) {
      errors.push(`Unknown preset: ${input.presetId}`);
      return { valid: false, errors, warnings };
    }
  }

  const adapterKey = preset?.adapterKey ?? input.adapterKey;
  const sourceType = preset?.sourceType ?? input.sourceType;

  if (!adapterKey) {
    errors.push("adapterKey is required.");
  }

  if (!sourceType) {
    errors.push("sourceType is required.");
  }

  if (!input.name?.trim()) {
    errors.push("Source name is required.");
  }

  // Validate required fields from preset
  const config = input.config ?? {};
  if (preset && preset.id !== "custom") {
    for (const field of preset.fields) {
      if (field.required) {
        const value = config[field.key];
        if (value === undefined || value === null || value === "") {
          errors.push(`Missing required field: ${field.label} (${field.key})`);
        }
      }
    }
  }

  appendMissingRequiredConfigErrors(errors, adapterKey, config);

  // Validate adapterKey is known (if not custom)
  if (preset && preset.id !== "custom" && adapterKey !== preset.adapterKey) {
    warnings.push(`adapterKey "${adapterKey}" does not match preset "${preset.id}" expected value "${preset.adapterKey}".`);
  }

  const urlValue = typeof config.url === "string" ? config.url : "";
  if (urlValue && directRetailDomains.some((domain) => urlValue.includes(domain))) {
    warnings.push("Detected a direct official retail URL. These sites often enable anti-bot checks, so a proxy/API or mirrored page is usually more reliable.");
  }

  if (
    adapterKey &&
    ["generic_price_list", "generic_html_price_list"].includes(adapterKey) &&
    !config.exclude_title_keywords
  ) {
    warnings.push("No exclude_title_keywords configured. Consider excluding investment-product keywords such as 黄金, 基金, 金条, ETF to keep goods-price themes clean.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    presetId: preset?.id,
  };
}

export function assertValidSourceConfig(input: {
  name: string;
  sourceType: string;
  adapterKey: string;
  config?: Record<string, unknown>;
}) {
  const result = validateSourceConfig(input);

  if (!result.valid) {
    throw new Error(result.errors.join("; "));
  }
}

export async function createSource(input: SourceInput) {
  assertValidSourceConfig({
    name: input.name,
    sourceType: input.sourceType,
    adapterKey: input.adapterKey,
    config: input.config,
  });

  const db = requireDatabase();
  const now = new Date().toISOString();
  const onboardingStatus = input.onboardingStatus ?? "draft";

  const id = createId("source");
  const hasOnboardingStatusColumn = await hasSourcesOnboardingStatusColumn(db);
  const values: Record<string, unknown> = {
    id,
    theme_id: input.themeId,
    name: input.name,
    source_type: input.sourceType,
    adapter_key: input.adapterKey,
    status: onboardingStatus === "active" ? "active" : "paused",
    is_paused: onboardingStatus !== "active",
    config: input.config ?? {},
    created_at: now,
    updated_at: now,
  };

  if (hasOnboardingStatusColumn) {
    values.onboarding_status = onboardingStatus;
  }

  await db
    .insertInto("sources")
    .values(values as never)
    .execute();

  return { id, onboardingStatus };
}

/**
 * Get the current config version number for a source.
 * The config history stores PAST configs (version 1..N).
 * The active config is always version N+1 (or 1 if no history exists).
 * This ensures runs are stamped with the version that was active when they were created.
 */
async function getCurrentConfigVersion(db: NonNullable<ReturnType<typeof getDatabase>>, sourceId: string): Promise<number> {
  try {
    const lastVersion = await db
      .selectFrom("source_config_history" as any)
      .select("version")
      .where("source_id", "=", sourceId)
      .orderBy("version", "desc")
      .limit(1)
      .executeTakeFirst();
    return (lastVersion?.version ?? 0) + 1;
  } catch {
    return 1;
  }
}

export async function enqueueManualSourceRun(sourceId: string) {
  const db = requireDatabase();

  const source = await db
    .selectFrom("sources")
    .select(["id", "theme_id"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (!source) {
    return null;
  }

  const configVersion = await getCurrentConfigVersion(db, sourceId);

  await db
    .insertInto("source_runs")
    .values({
      id: createId("run"),
      source_id: source.id,
      theme_id: source.theme_id,
      trigger_type: "manual",
      status: "pending",
      config_version: configVersion ?? null,
      created_at: new Date().toISOString(),
    })
    .execute();

  return { queued: true, mode: "db" };
}

/**
 * Retry a source after a failed run. Creates a new manual run using current
 * source config (not the original run's config). The original run is kept
 * for audit. Only allowed when the original run actually failed.
 */
export async function retrySourceAfterFailure(sourceId: string, failedRunId: string) {
  const db = requireDatabase();

  // Verify the original run exists, belongs to this source, and actually failed
  const failedRun = await db
    .selectFrom("source_runs")
    .select(["id", "status", "source_id"])
    .where("id", "=", failedRunId)
    .where("source_id", "=", sourceId)
    .executeTakeFirst();

  if (!failedRun) {
    return null;
  }

  if (failedRun.status !== "failed") {
    return { rejected: true, reason: `Run status is '${failedRun.status}', not 'failed'` };
  }

  // Verify source exists
  const source = await db
    .selectFrom("sources")
    .select(["id", "theme_id"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (!source) {
    return null;
  }

  const newRunId = createId("run");
  const configVersion = await getCurrentConfigVersion(db, sourceId);

  await db
    .insertInto("source_runs")
    .values({
      id: newRunId,
      source_id: source.id,
      theme_id: source.theme_id,
      trigger_type: "manual",
      status: "pending",
      config_version: configVersion ?? null,
      created_at: new Date().toISOString(),
    })
    .execute();

  return { queued: true, mode: "db", runId: newRunId, triggeredBy: failedRunId };
}

export async function enqueueTestSourceRun(sourceId: string) {
  const db = requireDatabase();

  const source = await db
    .selectFrom("sources")
    .select(["id", "theme_id"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (!source) {
    return null;
  }

  const runId = createId("run");
  const configVersion = await getCurrentConfigVersion(db, sourceId);

  await db
    .insertInto("source_runs")
    .values({
      id: runId,
      source_id: source.id,
      theme_id: source.theme_id,
      trigger_type: "test",
      status: "pending",
      config_version: configVersion ?? null,
      created_at: new Date().toISOString(),
    })
    .execute();

  return { queued: true, mode: "db", triggerType: "test", runId };
}

/**
 * Enqueue a replay run that re-processes a stored snapshot without live fetch.
 * The worker reads the snapshot payload and re-runs normalize/detect/event.
 */
export async function enqueueReplaySourceRun(sourceId: string, snapshotId: string) {
  const db = requireDatabase();

  const source = await db
    .selectFrom("sources")
    .select(["id", "theme_id"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (!source) {
    return null;
  }

  // Verify the snapshot exists and belongs to this source
  const snapshot = await db
    .selectFrom("raw_snapshots")
    .select(["id"])
    .where("id", "=", snapshotId)
    .where("source_id", "=", sourceId)
    .executeTakeFirst();

  if (!snapshot) {
    return { rejected: true, reason: "Snapshot not found for this source" };
  }

  const runId = createId("run");
  const configVersion = await getCurrentConfigVersion(db, sourceId);

  await db
    .insertInto("source_runs")
    .values({
      id: runId,
      source_id: source.id,
      theme_id: source.theme_id,
      trigger_type: "replay",
      status: "pending",
      replay_snapshot_id: snapshotId,
      config_version: configVersion ?? null,
      created_at: new Date().toISOString(),
    })
    .execute();

  return { queued: true, mode: "db", triggerType: "replay", runId, snapshotId };
}

export type SourceReplayComparison = {
  replayRunId: string;
  status: string;
  originalRunId: string | null;
  replay: { recordCount: number; changeCount: number; eventCount: number };
  original: { recordCount: number; changeCount: number; eventCount: number };
  deltas: { recordDelta: number; changeDelta: number; eventDelta: number };
  failureLayer: string | null;
};

/**
 * Compare a replay run's results against the original run that produced the snapshot.
 */
export async function getSourceReplayComparison(sourceId: string, replayRunId: string): Promise<SourceReplayComparison | null> {
  const db = requireDatabase();

  // Get the replay run and its snapshot
  const replayRun = await db
    .selectFrom("source_runs")
    .select(["id", "status", "replay_snapshot_id", "error_message"])
    .where("id", "=", replayRunId)
    .where("source_id", "=", sourceId)
    .executeTakeFirst();

  if (!replayRun) return null;

  // Get the original run that produced the snapshot
  let originalRunId: string | null = null;
  if (replayRun.replay_snapshot_id) {
    const snapshot = await db
      .selectFrom("raw_snapshots")
      .select(["source_run_id"])
      .where("id", "=", replayRun.replay_snapshot_id)
      .executeTakeFirst();
    originalRunId = snapshot?.source_run_id ?? null;
  }

  // Count replay results
  const [replayRecords, replayChanges, replayEvents] = await Promise.all([
    db.selectFrom("normalized_records").select(({ fn }) => fn.count("id").as("count")).where("source_run_id", "=", replayRunId).executeTakeFirst(),
    db.selectFrom("changes").select(({ fn }) => fn.count("id").as("count")).where("source_run_id", "=", replayRunId).executeTakeFirst(),
    db.selectFrom("events").select(({ fn }) => fn.count("id").as("count")).where("source_run_id", "=", replayRunId).executeTakeFirst(),
  ]);

  const replay = {
    recordCount: Number(replayRecords?.count ?? 0),
    changeCount: Number(replayChanges?.count ?? 0),
    eventCount: Number(replayEvents?.count ?? 0),
  };

  // Count original results
  let original = { recordCount: 0, changeCount: 0, eventCount: 0 };
  if (originalRunId) {
    const [origRecords, origChanges, origEvents] = await Promise.all([
      db.selectFrom("normalized_records").select(({ fn }) => fn.count("id").as("count")).where("source_run_id", "=", originalRunId).executeTakeFirst(),
      db.selectFrom("changes").select(({ fn }) => fn.count("id").as("count")).where("source_run_id", "=", originalRunId).executeTakeFirst(),
      db.selectFrom("events").select(({ fn }) => fn.count("id").as("count")).where("source_run_id", "=", originalRunId).executeTakeFirst(),
    ]);
    original = {
      recordCount: Number(origRecords?.count ?? 0),
      changeCount: Number(origChanges?.count ?? 0),
      eventCount: Number(origEvents?.count ?? 0),
    };
  }

  // Identify failure layer
  let failureLayer: string | null = null;
  if (replayRun.status === "failed") {
    if (replay.recordCount === 0 && replay.changeCount === 0) {
      failureLayer = "normalize";
    } else if (replay.changeCount === 0 && replay.recordCount > 0) {
      failureLayer = "detect";
    } else if (replay.eventCount === 0 && replay.changeCount > 0) {
      failureLayer = "rule";
    }
  }

  return {
    replayRunId,
    status: replayRun.status,
    originalRunId,
    replay,
    original,
    deltas: {
      recordDelta: replay.recordCount - original.recordCount,
      changeDelta: replay.changeCount - original.changeCount,
      eventDelta: replay.eventCount - original.eventCount,
    },
    failureLayer,
  };
}

export type SourceTestRunPreview = {
  runId: string;
  status: string;
  triggerType: string;
  startedAt: string | null;
  finishedAt: string | null;
  fetchSummary: {
    success: boolean;
    snapshotCount: number;
    payloadPreview: string;
  };
  parseSummary: {
    recordCount: number;
    changeCount: number;
    eventCount: number;
  };
  sampleRecords: Array<{
    title: string;
    occurredAt: string;
    infoType: string;
    contentPreview: string;
  }>;
  issues: string[];
};

export async function getSourceTestRunPreview(sourceId: string): Promise<SourceTestRunPreview | null> {
  const db = requireDatabase();

  // Find the most recent test run for this source
  const testRun = await db
    .selectFrom("source_runs")
    .select(["id", "status", "trigger_type as triggerType", "started_at as startedAt", "finished_at as finishedAt", "error_message as errorMessage"])
    .where("source_id", "=", sourceId)
    .where("trigger_type", "=", "test")
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!testRun) {
    return null;
  }

  const issues: string[] = [];

  // For pending/running tests, return early with a "still processing" indicator
  if (testRun.status === "pending" || testRun.status === "running") {
    return {
      runId: testRun.id,
      status: testRun.status,
      triggerType: testRun.triggerType,
      startedAt: testRun.startedAt?.toISOString?.() ?? null,
      finishedAt: testRun.finishedAt?.toISOString?.() ?? null,
      fetchSummary: {
        success: false,
        snapshotCount: 0,
        payloadPreview: "",
      },
      parseSummary: {
        recordCount: 0,
        changeCount: 0,
        eventCount: 0,
      },
      sampleRecords: [],
      issues: [testRun.status === "pending" ? "测试运行正在排队等待中，请稍后刷新。" : "测试运行正在执行中，请稍后刷新。"],
    };
  }

  if (testRun.status === "failed") {
    issues.push(testRun.errorMessage ?? "Run failed with unknown error.");
  }

  // Get snapshot — test runs store structured results here
  const snapshot = await db
    .selectFrom("raw_snapshots")
    .select(["id", "payload_json as payloadJson", "fetched_at as fetchedAt"])
    .where("source_run_id", "=", testRun.id)
    .limit(1)
    .executeTakeFirst();

  const snapshotCount = snapshot ? 1 : 0;

  if (snapshotCount === 0 && testRun.status === "completed") {
    issues.push("运行完成但没有抓取到数据快照。请检查来源配置和目标 URL 是否正确。");
  } else if (snapshotCount === 0 && testRun.status === "failed") {
    issues.push("没有抓取到任何数据快照。请检查来源配置和目标 URL 是否正确。");
  }

  // Test runs store results in the snapshot; production runs query normalized_records
  const payload = snapshot?.payloadJson as Record<string, unknown> | null;
  const isTestSnapshot = payload && typeof payload === "object" && "is_test_run" in payload;

  let recordCount = 0;
  let changeCount = 0;
  let eventCount = 0;
  let sampleRecords: Array<{ title: string; occurredAt: string; infoType: string; contentPreview: string }> = [];
  let payloadPreview = "";

  if (isTestSnapshot) {
    // Test run: read from snapshot
    const testPayload = payload as {
      normalized_records?: Array<{ title: string; occurred_at: string; info_type: string; content: Record<string, unknown> }>;
      total_records?: number;
      raw_payload?: unknown;
    };
    recordCount = testPayload.total_records ?? 0;
    const records = testPayload.normalized_records ?? [];
    sampleRecords = records.slice(0, 5).map((r) => ({
      title: r.title,
      occurredAt: r.occurred_at,
      infoType: r.info_type,
      contentPreview: JSON.stringify(r.content ?? {}, null, 2).slice(0, 500),
    }));
    payloadPreview = JSON.stringify(testPayload.raw_payload ?? {}, null, 2).slice(0, 2000);
  } else {
    // Production run (or legacy): query database
    payloadPreview = payload ? JSON.stringify(payload, null, 2).slice(0, 2000) : "";

    const [records, recordCountResult] = await Promise.all([
      db
        .selectFrom("normalized_records")
        .select(["id", "title", "occurred_at as occurredAt", "info_type as infoType", "content"])
        .where("source_run_id", "=", testRun.id)
        .orderBy("occurred_at", "desc")
        .limit(10)
        .execute(),
      db
        .selectFrom("normalized_records")
        .select(({ fn }) => fn.count("id").as("count"))
        .where("source_run_id", "=", testRun.id)
        .executeTakeFirst(),
    ]);

    const changeCountResult = await db
      .selectFrom("changes")
      .select(({ fn }) => fn.count("id").as("count"))
      .where("source_run_id", "=", testRun.id)
      .executeTakeFirst();

    const eventCountResult = await db
      .selectFrom("events")
      .select(({ fn }) => fn.count("id").as("count"))
      .where("source_run_id", "=", testRun.id)
      .executeTakeFirst();

    recordCount = Number(recordCountResult?.count ?? 0);
    changeCount = Number(changeCountResult?.count ?? 0);
    eventCount = Number(eventCountResult?.count ?? 0);

    sampleRecords = records.slice(0, 5).map((record) => ({
      title: record.title,
      occurredAt: record.occurredAt?.toISOString?.() ?? String(record.occurredAt),
      infoType: record.infoType,
      contentPreview: JSON.stringify(record.content ?? {}, null, 2).slice(0, 500),
    }));

    if (records.length === 0 && testRun.status === "completed") {
      issues.push("运行完成但没有解析出任何记录。请检查适配器配置和解析规则。");
    }
  }

  return {
    runId: testRun.id,
    status: testRun.status,
    triggerType: testRun.triggerType,
    startedAt: testRun.startedAt?.toISOString?.() ?? null,
    finishedAt: testRun.finishedAt?.toISOString?.() ?? null,
    fetchSummary: {
      success: testRun.status !== "failed" && snapshotCount > 0,
      snapshotCount,
      payloadPreview,
    },
    parseSummary: {
      recordCount,
      changeCount,
      eventCount,
    },
    sampleRecords,
    issues,
  };
}

export async function updateSource(sourceId: string, input: SourceUpdateInput) {
  const db = requireDatabase();

  const existing = await db
    .selectFrom("sources")
    .select(["id"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  const nextValues: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    nextValues.name = input.name;
  }

  if (input.sourceType !== undefined) {
    nextValues.source_type = input.sourceType;
  }

  if (input.adapterKey !== undefined) {
    nextValues.adapter_key = input.adapterKey;
  }

  if (input.config !== undefined) {
    // Save current config to history before overwriting
    const currentConfigRow = await db
      .selectFrom("sources")
      .select("config")
      .where("id", "=", sourceId)
      .executeTakeFirst();

    if (currentConfigRow) {
      const currentConfig = typeof currentConfigRow.config === "string"
        ? JSON.parse(currentConfigRow.config)
        : currentConfigRow.config ?? {};

      try {
        // Get next version number
        const lastVersion = await db
          .selectFrom("source_config_history" as any)
          .select("version")
          .where("source_id", "=", sourceId)
          .orderBy("version", "desc")
          .limit(1)
          .executeTakeFirst();

        const nextVersion = (lastVersion?.version ?? 0) + 1;

        await db
          .insertInto("source_config_history" as any)
          .values({
            id: `config_history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            source_id: sourceId,
            config: currentConfig, // Pass object directly — Kysely handles jsonb serialization
            version: nextVersion,
            created_at: new Date().toISOString(),
          })
          .execute();
      } catch (error: unknown) {
        // Table may not exist yet during migration - log but don't fail the source update
        if (error instanceof Error && error.message.includes("does not exist")) {
          // Expected during migration - silently skip
        } else {
          console.error("Failed to save config history:", error);
        }
      }
    }

    nextValues.config = input.config;
  }

  if (input.isPaused !== undefined) {
    nextValues.is_paused = input.isPaused;
  }

  const hasOnboardingStatusColumn = await hasSourcesOnboardingStatusColumn(db);

  if (input.onboardingStatus !== undefined) {
    // Sync status and is_paused to match onboardingStatus
    if (input.onboardingStatus === "active") {
      nextValues.status = "active";
      nextValues.is_paused = false;
    } else {
      nextValues.status = "paused";
      nextValues.is_paused = true;
    }

    if (hasOnboardingStatusColumn) {
      nextValues.onboarding_status = input.onboardingStatus;
    }
  }

  await db
    .updateTable("sources")
    .set(nextValues)
    .where("id", "=", sourceId)
    .execute();

  // Read back actual values from DB for accurate return
  const updatedBaseQuery = db
    .selectFrom("sources")
    .select("is_paused as isPaused")
    .where("id", "=", sourceId);

  const updated = hasOnboardingStatusColumn
    ? await updatedBaseQuery.select("onboarding_status as onboardingStatus").executeTakeFirst()
    : await updatedBaseQuery.executeTakeFirst();
  const updatedOnboardingStatus = hasOnboardingStatusColumn
    ? (updated as { onboardingStatus?: "draft" | "ready_to_test" | "active" } | undefined)?.onboardingStatus
    : undefined;

  return {
    id: sourceId,
    isPaused: updated?.isPaused ?? false,
    onboardingStatus:
      updatedOnboardingStatus ??
      ((updated?.isPaused ?? false) ? "draft" : "active"),
    mode: "db",
  };
}

export async function updateSourcePaused(sourceId: string, isPaused: boolean) {
  return updateSource(sourceId, { isPaused });
}

export async function deleteSource(sourceId: string) {
  const db = requireDatabase();

  const existing = await db
    .selectFrom("sources")
    .select(["id"])
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  await db
    .deleteFrom("sources")
    .where("id", "=", sourceId)
    .execute();

  return { id: sourceId };
}

// ─── Config History ────────────────────────────────────────────────────────

export type SourceConfigVersion = {
  id: string;
  sourceId: string;
  config: Record<string, unknown>;
  version: number;
  createdAt: string;
};

export async function getSourceConfigHistory(sourceId: string): Promise<SourceConfigVersion[]> {
  const db = requireDatabase();

  const rows = await db
    .selectFrom("source_config_history" as any)
    .select(["id", "source_id", "config", "version", "created_at"])
    .where("source_id", "=", sourceId)
    .orderBy("version", "desc")
    .execute();

  return rows.map((row: any) => ({
    id: row.id,
    sourceId: row.source_id,
    config: typeof row.config === "string" ? JSON.parse(row.config) : row.config,
    version: row.version,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }));
}

export async function rollbackSourceConfig(sourceId: string, version: number): Promise<boolean> {
  const db = requireDatabase();

  const row = await db
    .selectFrom("source_config_history" as any)
    .select("config")
    .where("source_id", "=", sourceId)
    .where("version", "=", version)
    .executeTakeFirst();

  if (!row) return false;

  const config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;

  // Save current config as a new version before rolling back
  const current = await db
    .selectFrom("sources")
    .select("config")
    .where("id", "=", sourceId)
    .executeTakeFirst();

  if (current) {
    const currentConfig = typeof current.config === "string" ? JSON.parse(current.config) : current.config ?? {};
    const lastVersion = await db
      .selectFrom("source_config_history" as any)
      .select("version")
      .where("source_id", "=", sourceId)
      .orderBy("version", "desc")
      .limit(1)
      .executeTakeFirst();

    await db
      .insertInto("source_config_history" as any)
      .values({
        id: `config_history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source_id: sourceId,
        config: currentConfig, // Pass object directly — Kysely handles jsonb serialization
        version: (lastVersion?.version ?? 0) + 1,
        created_at: new Date().toISOString(),
      })
      .execute();
  }

  await db
    .updateTable("sources")
    .set({ config, updated_at: new Date().toISOString() }) // Pass object directly — Kysely handles jsonb serialization
    .where("id", "=", sourceId)
    .execute();

  return true;
}
