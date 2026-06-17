import { sql, type Kysely } from "kysely";

import { getDatabase } from "../db/client.js";
import { hasSourcesOnboardingStatusColumn } from "../db/source-schema-compat.js";
import type { Database } from "../db/schema.js";
import { createId } from "../lib/ids.js";
import { mockEvents, mockSources, mockThemes } from "../lib/mock-store.js";

type ThemeInput = {
  id?: string;
  name: string;
  themeType: string;
  infoType: string;
  description?: string;
  sources?: Array<{
    name: string;
    sourceType: string;
    adapterKey: string;
    config?: Record<string, unknown>;
  }>;
};

type ThemeUpdateInput = {
  name?: string;
  description?: string | null;
  status?: string;
};

export type ThemeReviewNote = {
  content: string;
  updatedAt: string | null;
  status?: "pending_review" | "reviewed" | "tracking";
  tags?: string[];
  nextReviewDate?: string | null;
};

export type ThemeReviewNoteUpdate = {
  content: string;
  status?: "pending_review" | "reviewed" | "tracking";
  tags?: string[];
  nextReviewDate?: string | null;
};

type ThemeCreateResult = {
  id: string;
  sourceIds: string[];
};

function formatNumberForInsight(value: unknown) {
  if (typeof value === "number") {
    return value.toLocaleString("zh-CN");
  }

  if (value == null || value === "") {
    return null;
  }

  return String(value);
}

function signalLabel(signal?: string | null) {
  switch (signal) {
    case "30d_low":
      return "30天新低";
    case "new_announcement":
      return "新公告";
    case "new_financial_event":
      return "新金融事件";
    case "liquidity_injection":
      return "流动性投放";
    case "liquidity_withdrawal":
      return "流动性回笼";
    case "neutral":
      return "中性";
    default:
      return signal ?? null;
  }
}

function contentUpdateTypeLabel(value: unknown) {
  switch (value) {
    case "feature_release":
      return "功能发布";
    case "version_release":
      return "版本发布";
    case "bug_fix":
      return "修复更新";
    case "marketing_campaign":
      return "营销活动";
    case "marketing":
      return "营销活动";
    case "policy_update":
      return "政策更新";
    case "announcement":
      return "官方公告";
    case "content_update":
      return "内容更新";
    default:
      return formatNumberForInsight(value);
  }
}

function buildLatestInsight(
  infoType: string,
  record: { content: Record<string, unknown> } | undefined,
  latestEvent?: { signal: string | null } | null,
) {
  if (!record) {
    return null;
  }

  const content = record.content ?? {};

  if (infoType === "price") {
    const price = formatNumberForInsight(content.price);
    const currency = formatNumberForInsight(content.currency);
    const spec = formatNumberForInsight(content.spec);

    if (!price) {
      return null;
    }

    return [price, currency, spec].filter(Boolean).join(" · ");
  }

  if (infoType === "financial_event") {
    const marketLabel = formatNumberForInsight(content.market_label);
    const benchmarkName = formatNumberForInsight(content.benchmark_name);
    const benchmarkChangePercent = toNumber(content.benchmark_change_percent);
    const fundFlowNetBillion = toNumber(content.fund_flow_net_billion);
    const fundFlowCurrency = formatNumberForInsight(content.fund_flow_currency);
    const securityName = formatNumberForInsight(content.security_name);
    const netAmount = toNumber(content.amount_billion_cny);
    const changeRate = toNumber(content.change_rate_percent);

    if (marketLabel) {
      return [
        marketLabel,
        benchmarkName && benchmarkChangePercent != null
          ? `${benchmarkName} ${formatSignedPercent(benchmarkChangePercent)}`
          : benchmarkName,
        fundFlowNetBillion != null
          ? `资金 ${formatSignedAmount(fundFlowNetBillion, fundFlowCurrency)}`
          : null,
      ].filter(Boolean).join(" · ");
    }

    if (securityName) {
      return [
        securityName,
        netAmount != null ? `净额 ${netAmount.toFixed(2)}亿元` : null,
        changeRate != null ? `涨跌 ${changeRate >= 0 ? "+" : ""}${changeRate.toFixed(2)}%` : null,
      ].filter(Boolean).join(" · ");
    }

    const direction = signalLabel(String(content.direction_label ?? latestEvent?.signal ?? ""));
    const amount = formatNumberForInsight(content.amount_billion_cny);
    const term = formatNumberForInsight(content.term_days);
    const operation = formatNumberForInsight(content.operation_type);

    return [direction, operation, amount ? `${amount}亿元` : null, term ? `${term}天期` : null]
      .filter(Boolean)
      .join(" · ");
  }

  if (infoType === "news_announcement") {
    const topic = formatNumberForInsight(content.release_topic_label);
    const category = formatNumberForInsight(content.category);

    const categoryLabel =
      category === "macro_release"
        ? "宏观发布"
        : category === "news_announcement"
          ? "官方发布"
          : category;
    const publisher = formatNumberForInsight(content.publisher);

    return [topic, categoryLabel, !topic && !categoryLabel ? publisher : null].filter(Boolean).join(" · ");
  }

  if (infoType === "content_update") {
    const updateType = contentUpdateTypeLabel(content.update_type);
    const objectName = formatNumberForInsight(content.object_name);

    return [updateType, objectName].filter(Boolean).join(" · ");
  }

  return null;
}

function buildNewsAnnouncementBreakdown(records: Array<{ content: Record<string, unknown> }>) {
  const counts = new Map<string, number>();

  for (const record of records) {
    const content = record.content ?? {};
    const topic = formatNumberForInsight(content.release_topic_label);
    const category = formatNumberForInsight(content.category);
    const categoryLabel =
      category === "macro_release"
        ? "宏观发布"
        : category === "news_announcement"
          ? "官方发布"
          : category;
    const label = topic || categoryLabel || "未分类";

    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const items = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  if (items.length === 0) {
    return null;
  }

  return {
    title: "发布主题分布",
    description: "按最近抓到的官方发布主题聚合，帮助你快速判断当前宏观关注点。",
    items,
  };
}

function buildFinancialEventBreakdown(records: Array<{ content: Record<string, unknown> }>) {
  const counts = new Map<string, number>();

  for (const record of records) {
    const content = record.content ?? {};
    const label = signalLabel(String(content.direction_label ?? "neutral")) ?? "中性";

    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const items = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  if (items.length === 0) {
    return null;
  }

  return {
    title: "方向分布",
    description: "按结构化金融事件的方向标签聚合，帮助你快速判断近期流动性倾向。",
    items,
  };
}

function buildContentUpdateBreakdown(records: Array<{ content: Record<string, unknown> }>) {
  const counts = new Map<string, number>();

  for (const record of records) {
    const content = record.content ?? {};
    const label = contentUpdateTypeLabel(content.update_type) || formatNumberForInsight(content.object_name) || "未分类";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const items = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  if (items.length === 0) {
    return null;
  }

  return {
    title: "更新类型分布",
    description: "按最近抓到的内容更新类型聚合，帮助你快速判断当前是功能发布、营销动作还是其他页面变更。",
    items,
  };
}

function buildThemeBreakdown(
  infoType: string,
  records: Array<{ content: Record<string, unknown> }>,
) {
  if (infoType === "content_update") {
    return buildContentUpdateBreakdown(records);
  }

  if (infoType === "news_announcement") {
    return buildNewsAnnouncementBreakdown(records);
  }

  if (infoType === "financial_event") {
    return buildFinancialEventBreakdown(records);
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatSignedPercent(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSignedAmount(value: number | null | undefined, currency: string | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} 亿${currency ?? ""}`.trim();
}

function directionToTone(direction: string | null | undefined): "positive" | "negative" | "neutral" {
  if (direction === "bullish" || direction === "liquidity_injection") {
    return "positive";
  }

  if (direction === "bearish" || direction === "liquidity_withdrawal") {
    return "negative";
  }

  return "neutral";
}

type MarketOverviewRecord = {
  market: "a_share" | "hk";
  marketLabel: string;
  occurredAt: string;
  tone: "positive" | "negative" | "neutral";
  directionLabel: string;
  summary: string;
  benchmarkName: string | null;
  benchmarkChangePercent: number | null;
  fundFlowDirection: "inflow" | "outflow" | "flat";
  fundFlowNetBillion: number | null;
  fundFlowTurnoverBillion: number | null;
  fundFlowCurrency: string | null;
  indices: Array<{
    code: string;
    label: string;
    latest: number | null;
    changePercent: number | null;
  }>;
  sectorFlows: Array<{
    code: string;
    label: string;
    changePercent: number | null;
    netInflowBillion: number | null;
    leadingStockName: string | null;
    leadingStockCode: string | null;
  }>;
  topMovers: Array<{
    code: string;
    label: string;
    latest: number | null;
    changePercent: number | null;
    turnoverBillion: number | null;
    reasons?: string[];
  }>;
  topDecliners: Array<{
    code: string;
    label: string;
    latest: number | null;
    changePercent: number | null;
    turnoverBillion: number | null;
    reasons?: string[];
  }>;
  highlights: string[];
};

function parseMarketOverviewRecord(input: {
  occurredAt: string | Date;
  content: Record<string, unknown>;
}): MarketOverviewRecord | null {
  const content = input.content ?? {};

  if (content.event_class !== "market_overview") {
    return null;
  }

  const market = content.market_region === "hk" ? "hk" : content.market_region === "a_share" ? "a_share" : null;

  if (!market) {
    return null;
  }

  const rawIndices = Array.isArray(content.major_indices) ? content.major_indices : [];
  const indices = rawIndices
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      return {
        code: typeof row.code === "string" ? row.code : "",
        label: typeof row.label === "string" ? row.label : typeof row.name === "string" ? row.name : "未命名指数",
        latest: toNumber(row.latest),
        changePercent: toNumber(row.change_percent ?? row.changePercent),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const rawSectorFlows = Array.isArray(content.sector_flows) ? content.sector_flows : [];
  const sectorFlows = rawSectorFlows
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      return {
        code: typeof row.code === "string" ? row.code : "",
        label: typeof row.label === "string" ? row.label : "未命名板块",
        changePercent: toNumber(row.change_percent ?? row.changePercent),
        netInflowBillion: toNumber(row.net_inflow_billion ?? row.netInflowBillion),
        leadingStockName: typeof row.leading_stock_name === "string" ? row.leading_stock_name : null,
        leadingStockCode: typeof row.leading_stock_code === "string" ? row.leading_stock_code : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  function parseMovers(value: unknown) {
    const rows = Array.isArray(value) ? value : [];
    return rows
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const row = item as Record<string, unknown>;
        return {
          code: typeof row.code === "string" ? row.code : "",
          label: typeof row.label === "string" ? row.label : "未命名个股",
          latest: toNumber(row.latest),
          changePercent: toNumber(row.change_percent ?? row.changePercent),
          turnoverBillion: toNumber(row.turnover_billion ?? row.turnoverBillion),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  const highlights = (Array.isArray(content.summary_points) ? content.summary_points : [])
    .map((item) => (typeof item === "string" ? item : null))
    .filter((item): item is string => Boolean(item));

  const benchmarkChangePercent = toNumber(content.benchmark_change_percent);
  const fundFlowNetBillion = toNumber(content.fund_flow_net_billion);
  const fundFlowTurnoverBillion = toNumber(content.fund_flow_turnover_billion);
  const marketLabel = typeof content.market_label === "string"
    ? content.market_label
    : market === "a_share"
      ? "A股"
      : "港股";
  const occurredAt = input.occurredAt instanceof Date
    ? input.occurredAt.toISOString()
    : String(input.occurredAt);
  const directionLabel = typeof content.direction_label === "string"
    ? content.direction_label
    : "neutral";
  const flowDirection = content.fund_flow_direction === "inflow" || content.fund_flow_direction === "outflow"
    ? content.fund_flow_direction
    : "flat";

  return {
    market,
    marketLabel,
    occurredAt,
    tone: directionToTone(directionLabel),
    directionLabel,
    summary: typeof content.description === "string" ? content.description : "",
    benchmarkName: typeof content.benchmark_name === "string" ? content.benchmark_name : null,
    benchmarkChangePercent,
    fundFlowDirection: flowDirection,
    fundFlowNetBillion,
    fundFlowTurnoverBillion,
    fundFlowCurrency: typeof content.fund_flow_currency === "string" ? content.fund_flow_currency : null,
    indices,
    sectorFlows,
    topMovers: parseMovers(content.top_movers),
    topDecliners: parseMovers(content.top_decliners),
    highlights,
  };
}

function inferMoverReasons(input: {
  mover: {
    code: string;
    label: string;
    changePercent: number | null;
  };
  marketRecord: MarketOverviewRecord;
  history: MarketOverviewRecord[];
  direction: "up" | "down";
}) {
  const reasons: string[] = [];
  const { mover, marketRecord, history, direction } = input;

  const matchingSector = marketRecord.sectorFlows.find(
    (sector) =>
      (sector.leadingStockCode && sector.leadingStockCode === mover.code) ||
      (sector.leadingStockName && sector.leadingStockName === mover.label),
  );

  if (matchingSector) {
    reasons.push(
      `板块资金共振：${matchingSector.label}净流向 ${formatSignedAmount(matchingSector.netInflowBillion, "CNY") ?? "--"}`
    );
  }

  let streak = 1;
  for (const previous of history.slice(1)) {
    const sameSideList = direction === "up" ? previous.topMovers : previous.topDecliners;
    if (sameSideList.some((item) => item.code === mover.code)) {
      streak += 1;
      continue;
    }
    break;
  }

  if (streak >= 2) {
    reasons.push(`连续 ${streak} 个交易日进入${direction === "up" ? "强势" : "弱势"}榜`);
  }

  if (direction === "up" && marketRecord.tone === "positive") {
    reasons.push(`${marketRecord.marketLabel}整体偏强，风险偏好在扩散`);
  }

  if (direction === "down" && marketRecord.tone === "negative") {
    reasons.push(`${marketRecord.marketLabel}整体承压，弱势个股延续回落`);
  }

  if (direction === "up" && marketRecord.market === "hk" && marketRecord.fundFlowDirection === "inflow") {
    reasons.push("南向资金净流入，对港股强势股形成支撑");
  }

  if (direction === "up" && marketRecord.market === "a_share" && marketRecord.fundFlowDirection === "inflow") {
    reasons.push("北向资金回暖，A股强势主线更容易扩散");
  }

  if (direction === "down" && marketRecord.fundFlowDirection === "outflow") {
    reasons.push("资金面偏流出，回调股承压更明显");
  }

  return reasons.slice(0, 3);
}

function buildThemeMarketOverview(records: Array<{
  occurredAt: string | Date;
  content: Record<string, unknown>;
}>) {
  const overviewRecords = records
    .map((record) => parseMarketOverviewRecord(record))
    .filter((record): record is MarketOverviewRecord => Boolean(record));

  if (overviewRecords.length === 0) {
    return null;
  }

  const latestByMarket = new Map<string, MarketOverviewRecord>();

  for (const record of overviewRecords) {
    if (!latestByMarket.has(record.market)) {
      latestByMarket.set(record.market, record);
    }
  }

  const snapshots = ["a_share", "hk"]
    .map((market) => latestByMarket.get(market))
    .filter((item): item is MarketOverviewRecord => Boolean(item))
    .map((snapshot) => {
      const marketHistory = overviewRecords.filter((record) => record.market === snapshot.market);
      const benchmarkText = formatSignedPercent(snapshot.benchmarkChangePercent);
      const flowText = formatSignedAmount(snapshot.fundFlowNetBillion, snapshot.fundFlowCurrency);
      const directionText =
        snapshot.directionLabel === "bullish"
          ? "偏强"
          : snapshot.directionLabel === "bearish"
            ? "偏弱"
            : "震荡";

      return {
        market: snapshot.market,
        marketLabel: snapshot.marketLabel,
        occurredAt: snapshot.occurredAt,
        tone: snapshot.tone,
        directionLabel: directionText,
        headline: `${snapshot.marketLabel}整体${directionText}`,
        summary: snapshot.summary,
        benchmarkName: snapshot.benchmarkName,
        benchmarkChangePercent: snapshot.benchmarkChangePercent,
        fundFlowDirection: snapshot.fundFlowDirection,
        fundFlowNetBillion: snapshot.fundFlowNetBillion,
        fundFlowTurnoverBillion: snapshot.fundFlowTurnoverBillion,
        fundFlowCurrency: snapshot.fundFlowCurrency,
        indices: snapshot.indices,
        sectorFlows: snapshot.sectorFlows,
        topMovers: snapshot.topMovers.map((mover) => ({
          ...mover,
          reasons: inferMoverReasons({
            mover,
            marketRecord: snapshot,
            history: marketHistory,
            direction: "up",
          }),
        })),
        topDecliners: snapshot.topDecliners.map((mover) => ({
          ...mover,
          reasons: inferMoverReasons({
            mover,
            marketRecord: snapshot,
            history: marketHistory,
            direction: "down",
          }),
        })),
        highlights: [
          benchmarkText && snapshot.benchmarkName
            ? `${snapshot.benchmarkName} ${benchmarkText}`
            : null,
          flowText ? `资金面 ${flowText}` : null,
          snapshot.sectorFlows[0]
            ? `板块资金领先: ${snapshot.sectorFlows[0].label} ${formatSignedAmount(snapshot.sectorFlows[0].netInflowBillion, "CNY") ?? ""}`.trim()
            : null,
          snapshot.topMovers[0]
            ? `异动个股: ${snapshot.topMovers[0].label} ${formatSignedPercent(snapshot.topMovers[0].changePercent) ?? ""}`.trim()
            : null,
          ...snapshot.highlights,
        ].filter((item): item is string => Boolean(item)),
      };
    });

  const positiveCount = snapshots.filter((snapshot) => snapshot.tone === "positive").length;
  const negativeCount = snapshots.filter((snapshot) => snapshot.tone === "negative").length;
  const headline =
    positiveCount === snapshots.length
      ? "A股与港股当日共振偏强"
      : negativeCount === snapshots.length
        ? "A股与港股当日共振偏弱"
        : "A股与港股当日表现分化";
  const summary = snapshots
    .map((snapshot) => {
      const benchmarkText = formatSignedPercent(snapshot.benchmarkChangePercent);
      const flowText = formatSignedAmount(snapshot.fundFlowNetBillion, snapshot.fundFlowCurrency);
      return [
        snapshot.marketLabel,
        benchmarkText ? `${snapshot.benchmarkName ?? "基准"} ${benchmarkText}` : null,
        flowText ? `资金 ${flowText}` : null,
      ].filter(Boolean).join("，");
    })
    .join("；");

  return {
    headline,
    summary,
    crossMarketHighlights: snapshots.map((snapshot) => snapshot.headline),
    snapshots,
  };
}

function toTimestamp(value?: string | Date | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildThemeAnalysis(input: {
  themeType: string;
  latestInsight?: string | null;
  events: Array<{ title: string; signal: string | null; occurredAt: string | Date; summary: string }>;
  records?: Array<{ occurredAt: string | Date; content: Record<string, unknown> }>;
  sources: Array<{
    name?: string;
    status: string;
    isPaused?: boolean | null;
    latestRunStatus?: string | null;
    latestSuccessAt?: string | Date | null;
    latestFailureAt?: string | Date | null;
  }>;
}) {
  const latestEvent = input.events[0] ?? null;
  const threshold = Date.now() - 24 * 60 * 60 * 1000;
  const recentEventCount = input.events.filter((event) => toTimestamp(event.occurredAt) >= threshold).length;
  const warningSources = input.sources.filter((s) => s.status === "warning");
  const pausedSources = input.sources.filter((s) => s.isPaused);
  const healthySources = input.sources.filter((s) => s.status === "healthy" && !s.isPaused);
  const pendingCount = input.sources.filter((s) => s.latestRunStatus === "pending").length;
  const staleSources = input.sources.filter((s) => {
    const latest = Math.max(toTimestamp(s.latestSuccessAt), toTimestamp(s.latestFailureAt));
    return latest > 0 && latest < Date.now() - 48 * 60 * 60 * 1000;
  });
  const warningCount = warningSources.length;
  const pausedCount = pausedSources.length;
  const staleCount = staleSources.length;

  // Signal accumulation across all events
  const bullishSignals = ["bullish", "liquidity_injection", "30d_low"];
  const bearishSignals = ["bearish", "liquidity_withdrawal"];
  const signalAccumulation = {
    bullish: input.events.filter((e) => e.signal && bullishSignals.includes(e.signal)).length,
    bearish: input.events.filter((e) => e.signal && bearishSignals.includes(e.signal)).length,
    neutral: input.events.filter((e) => !e.signal || (!bullishSignals.includes(e.signal) && !bearishSignals.includes(e.signal))).length,
    recentBullish: input.events.filter((e) => toTimestamp(e.occurredAt) >= threshold && e.signal && bullishSignals.includes(e.signal)).length,
    recentBearish: input.events.filter((e) => toTimestamp(e.occurredAt) >= threshold && e.signal && bearishSignals.includes(e.signal)).length,
  };

  // Determine stance based on signal accumulation
  const netSignal = signalAccumulation.bullish - signalAccumulation.bearish;
  const recentNetSignal = signalAccumulation.recentBullish - signalAccumulation.recentBearish;

  // Multi-event accumulation: detect streaks and conflicting signals (Task 7)
  const sortedEvents = [...input.events].sort(
    (a, b) => toTimestamp(b.occurredAt) - toTimestamp(a.occurredAt),
  );
  const recentStreak = (() => {
    if (sortedEvents.length === 0) return { direction: "none" as const, count: 0 };
    const recent = sortedEvents.slice(0, 5);
    const bullishCount = recent.filter(
      (e) => e.signal && bullishSignals.includes(e.signal),
    ).length;
    const bearishCount = recent.filter(
      (e) => e.signal && bearishSignals.includes(e.signal),
    ).length;
    if (bullishCount >= 3 && bearishCount === 0)
      return { direction: "bullish" as const, count: bullishCount };
    if (bearishCount >= 3 && bullishCount === 0)
      return { direction: "bearish" as const, count: bearishCount };
    return { direction: "mixed" as const, count: recent.length };
  })();

  // Conflicting signal reduction: lower confidence when recent signals conflict
  const hasConflictingSignals =
    signalAccumulation.recentBullish > 0 && signalAccumulation.recentBearish > 0;

  let stance: "bullish" | "bearish" | "watch" | "neutral";
  if (recentStreak.direction === "bullish" && recentStreak.count >= 3) stance = "bullish";
  else if (recentStreak.direction === "bearish" && recentStreak.count >= 3) stance = "bearish";
  else if (recentNetSignal >= 2 && !hasConflictingSignals) stance = "bullish";
  else if (recentNetSignal <= -2 && !hasConflictingSignals) stance = "bearish";
  else if (hasConflictingSignals) stance = "watch";
  else if (Math.abs(netSignal) >= 3) stance = "watch";
  else stance = "neutral";

  // Supporting and conflicting sources — with concrete reasons
  const supportingSources: string[] = [];
  const conflictingSources: string[] = [];

  // Supporting: healthy sources providing data
  if (healthySources.length > 0) {
    const names = healthySources.map((s) => s.name).filter(Boolean);
    supportingSources.push(
      names.length > 0
        ? `数据正常: ${names.join(", ")}`
        : `${healthySources.length} 个来源数据正常`
    );
  }

  // Conflicting: sources with specific issues
  if (warningSources.length > 0) {
    const names = warningSources.map((s) => s.name).filter(Boolean);
    conflictingSources.push(
      names.length > 0
        ? `抓取异常: ${names.join(", ")} — 数据可能不完整`
        : `${warningSources.length} 个来源抓取异常`
    );
  }
  if (pausedSources.length > 0) {
    const names = pausedSources.map((s) => s.name).filter(Boolean);
    conflictingSources.push(
      names.length > 0
        ? `已暂停: ${names.join(", ")} — 无法获取最新数据`
        : `${pausedSources.length} 个来源已暂停`
    );
  }
  if (staleSources.length > 0) {
    const names = staleSources.map((s) => s.name).filter(Boolean);
    conflictingSources.push(
      names.length > 0
        ? `数据过期(>48h): ${names.join(", ")} — 结论可能滞后`
        : `${staleSources.length} 个来源数据过期`
    );
  }

  // Price-specific conflict: divergence between sources
  if (input.themeType === "price" && input.records && input.records.length >= 2) {
    const prices = input.records
      .map((r) => Number(r.content.price))
      .filter((p) => Number.isFinite(p) && p > 0);
    if (prices.length >= 2) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const divergence = ((maxPrice - minPrice) / minPrice) * 100;
      if (divergence > 10) {
        conflictingSources.push(
          `跨源价差 ${divergence.toFixed(1)}% — 最低 ${minPrice} vs 最高 ${maxPrice}，需确认是否同配置`
        );
      }
    }
  }
  const latestPrice =
    input.themeType === "price" && input.records?.length ? Number(input.records[0].content.price ?? NaN) : NaN;
  const olderPrice =
    input.themeType === "price" && input.records && input.records.length > 1
      ? Number(input.records[input.records.length - 1].content.price ?? NaN)
      : NaN;
  const priceDelta =
    Number.isFinite(latestPrice) && Number.isFinite(olderPrice) && olderPrice !== 0
      ? ((latestPrice - olderPrice) / olderPrice) * 100
      : null;

  if (input.themeType === "price") {
    // Extract trust info from latest price record
    const latestPriceRecord = input.records?.[0];
    const trustScore = latestPriceRecord?.content?.trust_score as number | undefined;
    const trustFactors = (latestPriceRecord?.content?.trust_factors as string[]) ?? [];
    const riskLevel = latestPriceRecord?.content?.risk_level as string | undefined;

    // Price-specific judgment: worth buying / worth waiting / worth attention / watching
    const priceJudgment = (() => {
      const healthySourceCount = input.sources.filter((s) => s.status === "healthy" && !s.isPaused).length;
      const totalActiveSources = input.sources.filter((s) => !s.isPaused).length;
      const sourceReliability = totalActiveSources > 0 ? healthySourceCount / totalActiveSources : 0;

      if (latestEvent?.signal === "30d_low" && stance === "bullish" && sourceReliability >= 0.7) {
        return {
          level: "worth_buying" as const,
          label: "值得关注买入",
          trustHint: `${healthySourceCount}/${totalActiveSources} 个来源状态正常，30天新低信号可信度较高`,
          reason: "多源验证的30天新低，且价格趋势向下，建议尽快核实后决定",
          trustScore: trustScore ?? null,
          riskLevel: riskLevel ?? null,
        };
      }
      if (latestEvent?.signal === "30d_low") {
        return {
          level: "worth_attention" as const,
          label: "值得关注",
          trustHint: sourceReliability < 0.7
            ? `仅 ${healthySourceCount}/${totalActiveSources} 个来源正常，建议先确认数据完整性`
            : "检测到30天新低，建议核验是否为同配置真实成交价",
          reason: "出现30天新低信号，但需要交叉验证价格真实性",
          trustScore: trustScore ?? null,
          riskLevel: riskLevel ?? null,
        };
      }
      if (priceDelta != null && priceDelta < -5 && recentEventCount >= 2) {
        return {
          level: "worth_waiting" as const,
          label: "建议继续等待",
          trustHint: "价格仍在下行通道，等待可能获得更好价格",
          reason: `价格已下跌 ${Math.abs(priceDelta).toFixed(1)}%，且近期有多个看空信号`,
          trustScore: trustScore ?? null,
          riskLevel: riskLevel ?? null,
        };
      }
      if (priceDelta != null && priceDelta > 5) {
        return {
          level: "worth_attention" as const,
          label: "价格回升中",
          trustHint: "近期价格反弹，如需购买建议尽早关注",
          reason: `价格已回升 ${priceDelta.toFixed(1)}%，可能错失低价窗口`,
          trustScore: trustScore ?? null,
          riskLevel: riskLevel ?? null,
        };
      }
      return {
        level: "watching" as const,
        label: "持续观察",
        trustHint: riskLevel === "high_risk" ? "价格可信度较低，建议多源验证" : null,
        reason: "当前信号不够明确，建议继续收集数据",
        trustScore: trustScore ?? null,
        riskLevel: riskLevel ?? null,
      };
    })();

    // Build trust-aware key points
    const trustKeyPoint = trustScore != null
      ? `价格可信度: ${trustScore}/100 (${riskLevel === "likely_valid" ? "较可信" : riskLevel === "suspicious" ? "需验证" : "高风险"})`
      : null;

    return {
      tone: latestEvent?.signal === "30d_low" ? "positive" : "neutral",
      stance,
      headline: latestEvent?.signal === "30d_low" ? "当前价格处于近期低位" : "当前价格仍以持续观察为主",
      summary:
        latestEvent?.signal === "30d_low"
          ? `最近一次事件已触发 30 天新低，当前抓到的价格摘要为 ${input.latestInsight ?? "暂无"}。`
          : `当前价格主题最近的关键信息为 ${input.latestInsight ?? "暂无"}，还没有形成更强的买入信号。`,
      keyPoints: [
        latestEvent ? `最新信号：${latestEvent.title}` : "最近没有新的价格事件。",
        input.latestInsight ? `最新价格摘要：${input.latestInsight}` : "最近没有可用的价格摘要。",
        `最近24小时新增 ${recentEventCount} 条事件。`,
        `判断：${priceJudgment.label}`,
        trustKeyPoint,
      ].filter(Boolean) as string[],
      risks: [
        warningCount > 0 ? `存在 ${warningCount} 个异常来源，当前价格结论需要先复核。`
          : "当前未发现异常来源。",
        pausedCount > 0 ? `有 ${pausedCount} 个来源已暂停，跨平台比价可能不完整。`
          : "当前来源覆盖完整度较好。",
        staleCount > 0 ? `有 ${staleCount} 个来源超过48小时没有新结果，结论可能滞后。`
          : "最近来源更新时效基本正常。",
        hasConflictingSignals ? "近期存在方向矛盾的信号，建议谨慎判断。" : null,
      ].filter(Boolean) as string[],
      actions: [
        "优先核验最低价是否为同配置、可成交且不是异常挂价。",
        pendingCount > 0 ? "等待排队中的来源完成后，再决定是否要跟进。"
          : "必要时立即运行全部来源，再决定是否跟进。",
        priceJudgment.level === "worth_buying" ? "当前信号较强，建议尽快核实后决定是否出手。" : null,
        priceJudgment.level === "worth_waiting" ? "价格仍在下行，耐心等待可能获得更好价格。" : null,
      ].filter(Boolean) as string[],
      recentChange: {
        headline: recentEventCount > 0 ? "最近24小时出现新的价格变化" : "最近24小时没有新的价格变化",
        summary:
          recentEventCount > 0
            ? "建议把最近24小时事件和更早历史价格放在一起看，判断当前低价是否延续。"
            : "当前判断更多依赖历史记录，建议继续等待下一轮抓取结果。",
        highlights: [
          recentEventCount > 0 ? `最近24小时新增 ${recentEventCount} 条价格事件。` : "最近24小时没有新增价格事件。",
          latestEvent ? `最新价格信号为 ${latestEvent.title}。` : "当前没有可比较的最新价格信号。",
        ],
      },
      trend: {
        headline:
          priceDelta == null
            ? "当前价格趋势样本不足"
            : priceDelta < -3
              ? "近阶段价格整体下行"
              : priceDelta > 3
                ? "近阶段价格整体回升"
                : "近阶段价格整体平稳",
        summary:
          priceDelta == null
            ? "当前可用于比较的价格记录还不够，建议继续累计更多时间序列数据。"
            : `根据当前可用记录估算，较早样本到最新样本的价格变化约为 ${priceDelta.toFixed(1)}%。`,
        highlights: [
          Number.isFinite(latestPrice) ? `最新价格：${latestPrice.toLocaleString("zh-CN")}` : "最新价格暂无。",
          Number.isFinite(olderPrice) ? `对比样本价格：${olderPrice.toLocaleString("zh-CN")}` : "对比样本价格暂无。",
          `最近24小时新增 ${recentEventCount} 条价格事件。`,
        ],
      },
      signalAccumulation,
      supportingSources,
      conflictingSources,
      priceJudgment,
      recentStreak,
    };
  }

  const marketOverview = input.themeType === "financial_event" && input.records
    ? buildThemeMarketOverview(
        input.records.map((record) => ({
          occurredAt: record.occurredAt,
          content: record.content,
        })),
      )
    : null;

  if (input.themeType === "financial_event" && marketOverview) {
    const aShareSnapshot = marketOverview.snapshots.find((item) => item.market === "a_share");
    const hkSnapshot = marketOverview.snapshots.find((item) => item.market === "hk");
    const positiveMarkets = marketOverview.snapshots.filter((item) => item.tone === "positive").length;
    const negativeMarkets = marketOverview.snapshots.filter((item) => item.tone === "negative").length;
    const averageBenchmark = (() => {
      const values = marketOverview.snapshots
        .map((item) => item.benchmarkChangePercent)
        .filter((value): value is number => value != null && Number.isFinite(value));

      if (values.length === 0) {
        return null;
      }

      return values.reduce((sum, value) => sum + value, 0) / values.length;
    })();
    const totalFundFlow = marketOverview.snapshots
      .map((item) => item.fundFlowNetBillion)
      .filter((value): value is number => value != null && Number.isFinite(value))
      .reduce((sum, value) => sum + value, 0);

    const marketStance =
      positiveMarkets === marketOverview.snapshots.length
        ? "bullish"
        : negativeMarkets === marketOverview.snapshots.length
          ? "bearish"
          : positiveMarkets > 0 && negativeMarkets > 0
            ? "watch"
            : stance;

    return {
      tone:
        positiveMarkets === marketOverview.snapshots.length
          ? "positive"
          : negativeMarkets === marketOverview.snapshots.length
            ? "negative"
            : "neutral",
      stance: marketStance,
      headline: marketOverview.headline,
      summary: marketOverview.summary,
      keyPoints: [
        aShareSnapshot
          ? `A股: ${aShareSnapshot.headline}，${aShareSnapshot.benchmarkName ?? "基准"} ${formatSignedPercent(aShareSnapshot.benchmarkChangePercent) ?? "--"}`
          : null,
        hkSnapshot
          ? `港股: ${hkSnapshot.headline}，${hkSnapshot.benchmarkName ?? "基准"} ${formatSignedPercent(hkSnapshot.benchmarkChangePercent) ?? "--"}`
          : null,
        Number.isFinite(totalFundFlow) ? `两地合计跟踪资金流向 ${totalFundFlow >= 0 ? "+" : ""}${totalFundFlow.toFixed(2)} 亿` : null,
        `最近24小时新增 ${recentEventCount} 条市场相关事件。`,
      ].filter((item): item is string => Boolean(item)),
      risks: [
        warningCount > 0 ? `存在 ${warningCount} 个异常来源，日度行情结论需要复核抓取结果。` : "当前未发现异常来源。",
        pausedCount > 0 ? `有 ${pausedCount} 个来源暂停，市场观察可能不完整。` : "当前来源运行状态较稳定。",
        positiveMarkets > 0 && negativeMarkets > 0 ? "A股与港股方向分化，跨市场判断需要分开看。" : null,
        staleCount > 0 ? `有 ${staleCount} 个来源更新滞后，盘后判断可能不够新。` : null,
      ].filter((item): item is string => Boolean(item)),
      actions: [
        "先看主要指数与资金流是否同向，再决定今天的整体基调是否成立。",
        "若 A 股与港股分化，优先按市场分别复盘，不要合并成单一结论。",
        "如需更细判断，可继续补充行业、板块或个股层面的资金流来源。",
      ],
      recentChange: {
        headline: recentEventCount > 0 ? "最近24小时市场概览已更新" : "最近24小时没有新的市场概览事件",
        summary:
          recentEventCount > 0
            ? "最新一轮收盘概览已经入库，可以直接比较 A股 和 港股 的指数方向与资金流是否同步。"
            : "当前还没有新的收盘概览事件，建议等待下一轮日度抓取。",
        highlights: marketOverview.snapshots.flatMap((snapshot) => snapshot.highlights.slice(0, 2)),
      },
      trend: {
        headline:
          averageBenchmark == null
            ? "当前市场趋势样本不足"
            : averageBenchmark >= 1
              ? "跨市场指数整体偏强"
              : averageBenchmark <= -1
                ? "跨市场指数整体偏弱"
                : "跨市场指数整体震荡",
        summary:
          averageBenchmark == null
            ? "当前可用的市场概览样本还不够，建议继续累积更多日度记录。"
            : `按当前市场概览估算，核心指数均值变化约为 ${formatSignedPercent(averageBenchmark)}。`,
        highlights: marketOverview.snapshots.map((snapshot) => [
          snapshot.marketLabel,
          snapshot.benchmarkName,
          formatSignedPercent(snapshot.benchmarkChangePercent),
          snapshot.fundFlowNetBillion != null
            ? `资金 ${formatSignedAmount(snapshot.fundFlowNetBillion, snapshot.fundFlowCurrency)}`
            : null,
        ].filter(Boolean).join(" · ")),
      },
      signalAccumulation,
      supportingSources,
      conflictingSources,
      recentStreak,
      hasConflictingSignals: positiveMarkets > 0 && negativeMarkets > 0,
    };
  }

  if (input.themeType === "financial_event") {
    const directionHeadline =
      latestEvent?.signal === "liquidity_injection"
        ? "近期流动性信号偏宽松"
        : latestEvent?.signal === "liquidity_withdrawal"
          ? "近期流动性信号偏收紧"
          : "近期流动性信号偏中性";

    return {
      tone:
        latestEvent?.signal === "liquidity_injection"
          ? "positive"
          : latestEvent?.signal === "liquidity_withdrawal"
            ? "negative"
            : "neutral",
      stance,
      headline: directionHeadline,
      summary: latestEvent?.summary ?? "当前还没有足够新的金融事件信号，建议继续等待后续公告。",
      keyPoints: [
        latestEvent ? `最新事件：${latestEvent.title}` : "最近没有新的金融事件。",
        input.latestInsight ? `结构化摘要：${input.latestInsight}` : "最近没有结构化摘要。",
        `最近24小时新增 ${recentEventCount} 条事件。`,
      ],
      risks: [
        warningCount > 0 ? `存在 ${warningCount} 个异常来源，当前判断可能缺少部分公告。`
          : "当前未发现异常来源。",
        pausedCount > 0 ? `有 ${pausedCount} 个来源暂停，后续政策变化可能漏抓。`
          : "当前来源运行状态较稳定。",
        staleCount > 0 ? `有 ${staleCount} 个来源更新滞后，短期判断需要谨慎。`
          : "最近来源更新时效基本正常。",
      ],
      actions: [
        "结合金额、期限、操作类型，判断对短期市场流动性的影响。",
        "如用于交易判断，建议和市场实际反应、后续官方公告交叉验证。",
      ],
      recentChange: {
        headline: recentEventCount > 0 ? "最近24小时流动性判断有更新" : "最近24小时没有新的流动性事件",
        summary:
          recentEventCount > 0
            ? "建议重点比较最近24小时事件和上一轮事件方向是否一致，确认判断是否需要调整。"
            : "当前仍以历史流动性事件作为主要参考，建议继续等后续公告。",
        highlights: [
          recentEventCount > 0 ? `最近24小时新增 ${recentEventCount} 条金融事件。` : "最近24小时没有新增金融事件。",
          latestEvent ? `最新金融事件为 ${latestEvent.title}。` : "当前没有可比较的最新金融事件。",
        ],
      },
      trend: {
        headline: recentEventCount > 0 ? "近阶段金融事件活跃度提升" : "近阶段金融事件节奏平稳",
        summary:
          recentEventCount > 0
            ? "最近24小时已经出现新的金融事件，说明短期判断仍在变化中。"
            : "最近没有新的金融事件，当前趋势判断更多依赖既有历史事件。",
        highlights: [
          `最近24小时新增 ${recentEventCount} 条金融事件。`,
          latestEvent ? `最新金融事件：${latestEvent.title}` : "当前没有最新金融事件。",
          input.latestInsight ? `最近结构化摘要：${input.latestInsight}` : "最近没有结构化摘要。",
        ],
      },
      signalAccumulation,
      supportingSources,
      conflictingSources,
      recentStreak,
      hasConflictingSignals,
    };
  }

  if (input.themeType === "content_update") {
    return {
      tone: "neutral",
      stance,
      headline: latestEvent ? "近期内容更新值得优先复核" : "当前以持续跟踪内容更新为主",
      summary:
        latestEvent?.summary ??
        "当前还没有新的内容更新事件，建议继续保持监控，等待下一轮页面变化或版本发布。",
      keyPoints: [
        latestEvent ? `最新更新：${latestEvent.title}` : "最近没有新的内容更新事件。",
        input.latestInsight ? `最近更新摘要：${input.latestInsight}` : "最近没有可用的结构化更新摘要。",
        `最近24小时新增 ${recentEventCount} 条事件。`,
      ],
      risks: [
        warningCount > 0 ? `存在 ${warningCount} 个异常来源，可能漏掉部分更新内容。`
          : "当前未发现异常来源。",
        pausedCount > 0 ? `有 ${pausedCount} 个来源已暂停，跨渠道更新对比可能不完整。`
          : "当前来源覆盖相对完整。",
        staleCount > 0 ? `有 ${staleCount} 个来源超过48小时没有新结果，更新节奏判断可能滞后。`
          : "最近来源更新时效基本正常。",
      ],
      actions: [
        "优先打开原始更新页面，确认这次具体改了哪些功能、文案或页面结构。",
        pendingCount > 0
          ? "等待排队中的来源完成后，再汇总这轮更新对你的主题是否有实际影响。"
          : "再结合历史更新节奏和竞品上下文，判断是否需要沉淀为新的结论或行动。",
      ],
      recentChange: {
        headline: recentEventCount > 0 ? "最近24小时出现新的内容更新" : "最近24小时没有新的内容更新",
        summary:
          recentEventCount > 0
            ? "建议把最近更新和更早版本变更放在一起看，判断这轮动作是单点更新还是连续推进。"
            : "当前仍以历史更新记录作为主要参考，建议继续保持监控。",
        highlights: [
          recentEventCount > 0 ? `最近24小时新增 ${recentEventCount} 条内容更新事件。` : "最近24小时没有新增内容更新事件。",
          latestEvent ? `最新内容更新为 ${latestEvent.title}。` : "当前没有可比较的最新内容更新。",
        ],
      },
      trend: {
        headline: recentEventCount > 0 ? "近阶段内容更新节奏在推进" : "近阶段内容更新节奏较平稳",
        summary:
          recentEventCount > 0
            ? "最近24小时已有新的内容更新事件，说明当前对象仍在持续变化。"
            : "最近没有新的内容更新事件，当前更适合结合既有更新历史做低频回看。",
        highlights: [
          `最近24小时新增 ${recentEventCount} 条内容更新事件。`,
          latestEvent ? `最新更新：${latestEvent.title}` : "当前没有最新更新。",
          input.latestInsight ? `最近结构化摘要：${input.latestInsight}` : "最近没有结构化摘要。",
        ],
      },
      signalAccumulation,
      supportingSources,
      conflictingSources,
      recentStreak,
      hasConflictingSignals,
    };
  }

  return {
    tone: "neutral",
    stance,
    headline: latestEvent ? "近期官方发布值得继续跟踪" : "当前以持续跟踪为主",
    summary: latestEvent?.summary ?? "当前还没有新的官方发布信号，建议继续保持监控。",
    keyPoints: [
      latestEvent ? `最新发布：${latestEvent.title}` : "最近没有新的官方发布。",
      input.latestInsight ? `最近摘要：${input.latestInsight}` : "最近没有可用摘要。",
      `最近24小时新增 ${recentEventCount} 条事件。`,
    ],
    risks: [
      warningCount > 0 ? `存在 ${warningCount} 个异常来源，可能漏掉部分发布。`
        : "当前未发现异常来源。",
      pausedCount > 0 ? `有 ${pausedCount} 个来源处于暂停状态，信息覆盖可能不完整。`
        : "当前来源覆盖相对完整。",
      staleCount > 0 ? `有 ${staleCount} 个来源更新滞后，建议补跑后再判断。`
        : "最近来源更新时效基本正常。",
    ],
    actions: [
      "优先阅读最新发布正文，确认是否需要转成更明确的利好/利空判断。",
      pendingCount > 0 ? "等待排队中的来源完成后，再汇总本轮判断。"
        : "如需更高把握，可立即补跑相关来源。",
    ],
    recentChange: {
      headline: recentEventCount > 0 ? "最近24小时有新的官方发布" : "最近24小时没有新的官方发布",
      summary:
        recentEventCount > 0
          ? "建议优先阅读最新发布，再与更早历史发布对比，确认本轮关注重点是否变化。"
          : "当前仍以历史发布背景作为主要参考，建议继续保持监控。",
      highlights: [
        recentEventCount > 0 ? `最近24小时新增 ${recentEventCount} 条发布相关事件。` : "最近24小时没有新增发布事件。",
        latestEvent ? `最新发布信号为 ${latestEvent.title}。` : "当前没有可比较的最新发布信号。",
      ],
    },
    trend: {
      headline: recentEventCount > 0 ? "近阶段发布节奏在加快" : "近阶段发布节奏较平稳",
      summary:
        recentEventCount > 0
          ? "最近24小时已有新的发布事件，说明当前信息面仍在更新。"
          : "最近没有新的发布事件，当前更适合结合历史发布背景持续跟踪。",
      highlights: [
        `最近24小时新增 ${recentEventCount} 条发布相关事件。`,
        latestEvent ? `最新发布：${latestEvent.title}` : "当前没有最新发布。",
        input.latestInsight ? `最近摘要：${input.latestInsight}` : "最近没有可用摘要。",
      ],
    },
    signalAccumulation,
    supportingSources,
    conflictingSources,
    recentStreak,
    hasConflictingSignals,
  };
}

function mapDatabaseThemeSummary(row: {
  id: string;
  name: string;
  theme_type: string;
  status: string;
  latest_run_at: Date | null;
  latest_event_at: Date | null;
  source_count: number | string | bigint;
  latest_success_at: Date | null;
  latest_failure_at: Date | null;
  open_event_count: number | string | bigint;
  tracking_event_count: number | string | bigint;
  ignored_event_count: number | string | bigint;
  unread_event_count: number | string | bigint;
  bookmarked_event_count: number | string | bigint;
  latest_bookmarked_at: Date | null;
}) {
  const latestSuccessAt = row.latest_success_at?.toISOString?.() ?? null;
  const latestFailureAt = row.latest_failure_at?.toISOString?.() ?? null;
  const sourceHealth =
    latestFailureAt && (!latestSuccessAt || latestFailureAt > latestSuccessAt) ? "warning" : "healthy";

  return {
    id: row.id,
    name: row.name,
    type: row.theme_type,
    status: row.status,
    latestRunAt: row.latest_run_at?.toISOString?.() ?? null,
    latestEventAt: row.latest_event_at?.toISOString?.() ?? null,
    sourceCount: Number(row.source_count ?? 0),
    latestSuccessAt,
    latestFailureAt,
    sourceHealth,
    openEventCount: Number(row.open_event_count ?? 0),
    trackingEventCount: Number(row.tracking_event_count ?? 0),
    ignoredEventCount: Number(row.ignored_event_count ?? 0),
    unreadEventCount: Number(row.unread_event_count ?? 0),
    bookmarkedEventCount: Number(row.bookmarked_event_count ?? 0),
    latestBookmarkedAt: row.latest_bookmarked_at?.toISOString?.() ?? null,
  };
}

async function listThemesFromDb(db: Kysely<Database>) {
  const rows = await db
    .selectFrom("themes as t")
    .leftJoin("sources as s", "s.theme_id", "t.id")
    .leftJoin("source_runs as sr", (join) =>
      join.onRef("sr.theme_id", "=", "t.id").on("sr.trigger_type", "!=", "test"),
    )
    .leftJoin("events as e", "e.theme_id", "t.id")
    .select(({ fn }) => [
      "t.id as id",
      "t.name as name",
      "t.theme_type as theme_type",
      "t.status as status",
      "t.metadata as metadata",
      fn.max("sr.finished_at").as("latest_run_at"),
      fn.max("e.occurred_at").as("latest_event_at"),
      sql<number>`count(distinct s.id)`.as("source_count"),
      sql<number>`count(distinct e.id) filter (where e.status = 'open')`.as("open_event_count"),
      sql<number>`count(distinct e.id) filter (where e.status = 'tracking')`.as("tracking_event_count"),
      sql<number>`count(distinct e.id) filter (where e.status = 'ignored')`.as("ignored_event_count"),
      sql<number>`count(distinct e.id) filter (where coalesce(e.is_read, false) = false)`.as("unread_event_count"),
      sql<number>`count(distinct e.id) filter (where coalesce(e.is_bookmarked, false) = true)`.as("bookmarked_event_count"),
      fn.max("e.bookmarked_at").as("latest_bookmarked_at"),
      fn.max("s.latest_success_at").as("latest_success_at"),
      fn.max("s.latest_failure_at").as("latest_failure_at"),
    ])
    .groupBy(["t.id", "t.name", "t.theme_type", "t.status", "t.metadata"])
    .orderBy("t.created_at desc")
    .execute();

  const summaries = rows.map((row) => {
    const base = mapDatabaseThemeSummary(row);
    // Extract review fields from metadata
    const rawMetadata = (row as Record<string, unknown>).metadata;
    let metadata: Record<string, unknown> = {};
    try {
      metadata = typeof rawMetadata === "string" ? JSON.parse(rawMetadata) : (rawMetadata as Record<string, unknown>) ?? {};
    } catch {
      metadata = {};
    }
    const reviewNote = metadata.reviewNote as Record<string, unknown> | undefined;

    return {
      ...base,
      reviewStatus: typeof reviewNote?.status === "string" ? reviewNote.status : null,
      reviewTags: Array.isArray(reviewNote?.tags) ? reviewNote.tags : [],
      nextReviewDate: typeof reviewNote?.nextReviewDate === "string" ? reviewNote.nextReviewDate : null,
    };
  });

  const latestEvents = await Promise.all(
    summaries.map(async (summary) => {
      const latestEvent = await db
        .selectFrom("events")
        .select(["title", "signal"])
        .where("theme_id", "=", summary.id)
        .orderBy("occurred_at desc")
        .limit(1)
        .executeTakeFirst();

      return {
        themeId: summary.id,
        latestEventTitle: latestEvent?.title ?? null,
        latestEventSignal: latestEvent?.signal ?? null,
      };
    }),
  );

  const latestRecords = await Promise.all(
    summaries.map(async (summary) => {
      const latestRecord = await db
        .selectFrom("normalized_records")
        .select(["content"])
        .where("theme_id", "=", summary.id)
        .orderBy("occurred_at desc")
        .limit(1)
        .executeTakeFirst();

      return {
        themeId: summary.id,
        latestRecord: latestRecord ?? null,
      };
    }),
  );

  return summaries.map((summary) => {
    const latestEvent = latestEvents.find((item) => item.themeId === summary.id);
    const latestRecord = latestRecords.find((item) => item.themeId === summary.id)?.latestRecord ?? null;

    return {
      ...summary,
      latestEventTitle: latestEvent?.latestEventTitle ?? null,
      latestEventSignal: latestEvent?.latestEventSignal ?? null,
      latestInsight: buildLatestInsight(summary.type, latestRecord ?? undefined, {
        signal: latestEvent?.latestEventSignal ?? null,
      }),
    };
  });
}

async function getThemeDetailFromDb(db: Kysely<Database>, themeId: string) {
  const theme = await db
    .selectFrom("themes")
    .select(["id", "name", "theme_type", "info_type", "description", "status", "created_at"])
    .where("id", "=", themeId)
    .executeTakeFirst();

  if (!theme) {
    return null;
  }

  const sources = await db
    .selectFrom("sources")
    .select([
      "id",
      "name",
      "status",
      "source_type as sourceType",
      "adapter_key as adapterKey",
      "config",
      "is_paused as isPaused",
      "latest_success_at as latestSuccessAt",
      "latest_failure_at as latestFailureAt",
    ])
    .where("theme_id", "=", themeId)
    .orderBy("created_at asc")
    .execute();

  const sourceRunSummaries = await Promise.all(
    sources.map(async (source) => {
      const latestRun = await db
        .selectFrom("source_runs")
        .select([
          "status",
          "started_at as startedAt",
          "finished_at as finishedAt",
        ])
        .where("source_id", "=", source.id)
        .where("trigger_type", "!=", "test")
        .orderBy("created_at desc")
        .limit(1)
        .executeTakeFirst();

      return {
        sourceId: source.id,
        latestRunStatus: latestRun?.status ?? null,
        latestRunAt:
          latestRun?.finishedAt?.toISOString?.() ??
          latestRun?.startedAt?.toISOString?.() ??
          null,
      };
    }),
  );

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
    .where("theme_id", "=", themeId)
    .orderBy("occurred_at desc")
    .limit(10)
    .execute();

  const history = await db
    .selectFrom("source_runs")
    .select([
      "created_at as at",
      "status as label",
    ])
    .where("theme_id", "=", themeId)
    .where("trigger_type", "!=", "test")
    .orderBy("created_at desc")
    .limit(10)
    .execute();

  const timelineRuns = await db
    .selectFrom("source_runs as sr")
    .innerJoin("sources as s", "s.id", "sr.source_id")
    .select([
      "sr.id as id",
      "sr.created_at as at",
      "sr.status as status",
      "sr.trigger_type as triggerType",
      "s.name as sourceName",
    ])
    .where("sr.theme_id", "=", themeId)
    .where("sr.trigger_type", "!=", "test")
    .orderBy("sr.created_at desc")
    .limit(10)
    .execute();

  const timelineChanges = await db
    .selectFrom("changes as c")
    .innerJoin("sources as s", "s.id", "c.source_id")
    .select([
      "c.id as id",
      "c.detected_at as at",
      "c.change_type as changeType",
      "c.summary as summary",
      "c.details as details",
      "s.name as sourceName",
    ])
    .where("c.theme_id", "=", themeId)
    .orderBy("c.detected_at desc")
    .limit(20)
    .execute();

  const timelineEvents = await db
    .selectFrom("events as e")
    .innerJoin("sources as s", "s.id", "e.source_id")
    .select([
      "e.id as id",
      "e.created_at as at",
      "e.signal as signal",
      "e.title as title",
      "e.summary as summary",
      "e.event_type as eventType",
      "s.name as sourceName",
    ])
    .where("e.theme_id", "=", themeId)
    .orderBy("e.created_at desc")
    .limit(20)
    .execute();

  const records = await db
    .selectFrom("normalized_records as nr")
    .innerJoin("sources as s", "s.id", "nr.source_id")
    .select([
      "nr.id as id",
      "nr.source_id as sourceId",
      "s.name as sourceName",
      "nr.title as title",
      "nr.occurred_at as occurredAt",
      "nr.info_type as infoType",
      "nr.content as content",
    ])
    .where("nr.theme_id", "=", themeId)
    .orderBy("nr.occurred_at desc")
    .limit(20)
    .execute();

  const breakdownRecords = await db
    .selectFrom("normalized_records")
    .select(["content"])
    .where("theme_id", "=", themeId)
    .orderBy("occurred_at desc")
    .limit(200)
    .execute();

  const latestInsight = buildLatestInsight(
    theme.info_type,
    records[0] ? { content: records[0].content as Record<string, unknown> } : undefined,
    events[0] ? { signal: events[0].signal } : null,
  );
  const marketOverview = buildThemeMarketOverview(
    records.map((item) => ({
      occurredAt: item.occurredAt,
      content: item.content as Record<string, unknown>,
    })),
  );
  const breakdown = buildThemeBreakdown(
    theme.info_type,
    breakdownRecords.map((item) => ({ content: item.content as Record<string, unknown> })),
  );

  const timeline = [
    ...timelineRuns.map((item) => ({
      id: item.id,
      kind: "run",
      at: item.at.toISOString?.() ?? item.at,
      title: `Source run ${item.status}`,
      summary: `${item.sourceName} · trigger: ${item.triggerType}`,
      meta: {
        status: item.status,
        triggerType: item.triggerType,
        sourceName: item.sourceName,
      },
    })),
    ...timelineChanges.map((item) => ({
      id: item.id,
      kind: "change",
      at: item.at.toISOString?.() ?? item.at,
      title: item.changeType,
      summary: item.summary,
      meta: {
        sourceName: item.sourceName,
        details: item.details,
      },
    })),
    ...timelineEvents.map((item) => ({
      id: item.id,
      kind: "event",
      at: item.at.toISOString?.() ?? item.at,
      title: item.title,
      summary: item.summary,
      meta: {
        signal: item.signal,
        eventType: item.eventType,
        sourceName: item.sourceName,
      },
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  const analysis = buildThemeAnalysis({
    themeType: theme.theme_type,
    latestInsight,
    events: events.map((item) => ({
      title: item.title,
      signal: item.signal,
      occurredAt: item.occurredAt,
      summary: item.summary,
    })),
    records: records.map((item) => ({
      occurredAt: item.occurredAt,
      content: item.content as Record<string, unknown>,
    })),
    sources: sources.map((item) => ({
      name: item.name,
      status: item.status,
      isPaused: item.isPaused,
      latestRunStatus: sourceRunSummaries.find((summary) => summary.sourceId === item.id)?.latestRunStatus ?? null,
      latestSuccessAt: item.latestSuccessAt,
      latestFailureAt: item.latestFailureAt,
    })),
  });

  return {
    theme: {
      id: theme.id,
      name: theme.name,
      type: theme.theme_type,
      infoType: theme.info_type,
      description: theme.description,
      status: theme.status,
      createdAt: theme.created_at,
      latestInsight,
    },
    sources: sources.map((item) => ({
      ...item,
      latestSuccessAt: item.latestSuccessAt?.toISOString?.() ?? null,
      latestFailureAt: item.latestFailureAt?.toISOString?.() ?? null,
      latestRunStatus:
        sourceRunSummaries.find((summary) => summary.sourceId === item.id)?.latestRunStatus ?? null,
      latestRunAt:
        sourceRunSummaries.find((summary) => summary.sourceId === item.id)?.latestRunAt ?? null,
    })),
    events: events.map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString?.() ?? item.occurredAt,
    })),
    history: history.map((item) => ({
      at: item.at.toISOString?.() ?? item.at,
      label: item.label,
    })),
    breakdown,
    marketOverview,
    timeline,
    records: records.map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString?.() ?? item.occurredAt,
    })),
    analysis,
  };
}

async function createThemeInDb(db: Kysely<Database>, input: ThemeInput): Promise<ThemeCreateResult> {
  const now = new Date().toISOString();
  const themeId = input.id?.trim() || createId("theme");
  const sourceIds: string[] = [];

  await db
    .insertInto("themes")
    .values({
      id: themeId,
      name: input.name,
      theme_type: input.themeType,
      info_type: input.infoType,
      description: input.description ?? null,
      status: "active",
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .execute();

  if (input.sources?.length) {
    const hasOnboardingStatusColumn = await hasSourcesOnboardingStatusColumn(db);
    const sourceRows = input.sources.map((source) => {
      const sourceId = createId("source");
      sourceIds.push(sourceId);

      const row: Record<string, unknown> = {
        id: sourceId,
        theme_id: themeId,
        name: source.name,
        source_type: source.sourceType,
        adapter_key: source.adapterKey,
        status: "active",
        is_paused: false,
        config: source.config ?? {},
        created_at: now,
        updated_at: now,
      };

      if (hasOnboardingStatusColumn) {
        row.onboarding_status = "active";
      }

      return row;
    });

    await db
      .insertInto("sources")
      .values(sourceRows as never)
      .execute();
  }

  return {
    id: themeId,
    sourceIds,
  };
}

export async function listThemes() {
  const db = getDatabase();

  if (!db) {
    return mockThemes.map((theme) => {
      const themeEvents = mockEvents.filter((event) => event.themeId === theme.id);
      const metadata = (theme as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
      const reviewNote = metadata?.reviewNote as Record<string, unknown> | undefined;

      return {
        ...theme,
        openEventCount: themeEvents.filter((event) => (event.status ?? "open") === "open").length,
        trackingEventCount: themeEvents.filter((event) => event.status === "tracking").length,
        ignoredEventCount: themeEvents.filter((event) => event.status === "ignored").length,
        unreadEventCount: themeEvents.filter((event) => !event.isRead).length,
        bookmarkedEventCount: themeEvents.filter((event) => Boolean(event.isBookmarked)).length,
        latestBookmarkedAt: themeEvents
          .filter((event) => event.isBookmarked && event.bookmarkedAt)
          .sort((left, right) => String(right.bookmarkedAt).localeCompare(String(left.bookmarkedAt)))[0]?.bookmarkedAt ?? null,
        reviewStatus: typeof reviewNote?.status === "string" ? reviewNote.status : null,
        reviewTags: Array.isArray(reviewNote?.tags) ? reviewNote.tags : [],
        nextReviewDate: typeof reviewNote?.nextReviewDate === "string" ? reviewNote.nextReviewDate : null,
      };
    });
  }

  return listThemesFromDb(db);
}

export async function getThemeDetail(themeId: string) {
  const db = getDatabase();

  if (!db) {
    const theme = mockThemes.find((item) => item.id === themeId);

    if (!theme) {
      return null;
    }

    const themeEvents = mockEvents.filter((item) => item.themeId === themeId);
    const themeSources = mockSources.filter((item) => item.themeId === themeId);

    // Build mock records based on theme type
    const mockRecords = buildMockThemeRecords(theme, themeEvents);
    const mockTimeline = buildMockThemeTimeline(theme, themeEvents, themeSources);
    const mockHistory = buildMockThemeHistory(theme);
    const mockBreakdown = buildMockThemeBreakdown(theme, mockRecords);
    const mockMarketOverview = buildThemeMarketOverview(
      mockRecords.map((item) => ({
        occurredAt: item.occurredAt,
        content: item.content,
      })),
    );

    return {
      theme,
      sources: themeSources,
      events: themeEvents,
      history: mockHistory,
      breakdown: mockBreakdown,
      marketOverview: mockMarketOverview,
      timeline: mockTimeline,
      records: mockRecords,
      analysis: buildThemeAnalysis({
        themeType: theme.type,
        latestInsight: null,
        events: themeEvents.map((item) => ({
          title: item.title,
          signal: item.signal,
          occurredAt: item.occurredAt,
          summary: item.summary,
        })),
        records: mockRecords.map((item) => ({
          occurredAt: item.occurredAt,
          content: item.content,
        })),
        sources: themeSources.map((item) => ({
          name: item.name,
          status: item.status,
          isPaused: item.isPaused,
          latestRunStatus: item.latestRunStatus,
          latestSuccessAt: item.latestSuccessAt,
          latestFailureAt: item.latestFailureAt,
        })),
      }),
    };
  }

  return getThemeDetailFromDb(db, themeId);
}

function buildMockThemeRecords(
  theme: { id: string; type: string },
  events: Array<{ id: string; themeId: string }>,
): Array<{
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  occurredAt: string;
  infoType: string;
  content: Record<string, unknown>;
}> {
  if (theme.type === "content_update") {
    return [
      {
        id: `${theme.id}-record-3`,
        sourceId: "source-figma-release-notes",
        sourceName: "Figma Release Notes",
        title: "Figma release notes item",
        occurredAt: "2026-06-01T07:35:00Z",
        infoType: "content_update",
        content: {
          object_name: "Figma",
          update_type: "feature_release",
          url: "https://www.figma.com/release-notes/",
          summary: "New dev mode improvements announced in the latest release notes.",
        },
      },
      {
        id: `${theme.id}-record-2`,
        sourceId: "source-figma-release-notes",
        sourceName: "Figma Release Notes",
        title: "Figma release notes item",
        occurredAt: "2026-05-31T07:30:00Z",
        infoType: "content_update",
        content: {
          object_name: "Figma",
          update_type: "marketing_campaign",
          url: "https://www.figma.com/release-notes/",
          summary: "Figma highlighted dev mode onboarding improvements in a new release note card.",
        },
      },
      {
        id: `${theme.id}-record-1`,
        sourceId: "source-figma-release-notes",
        sourceName: "Figma Release Notes",
        title: "Figma release notes item",
        occurredAt: "2026-05-29T07:30:00Z",
        infoType: "content_update",
        content: {
          object_name: "Figma",
          update_type: "bug_fix",
          url: "https://www.figma.com/release-notes/",
          summary: "A batch of editor bug fixes and performance improvements was published.",
        },
      },
    ];
  }

  if (theme.type === "news_announcement") {
    return [
      {
        id: `${theme.id}-record-1`,
        sourceId: "source-stats-cpi-release",
        sourceName: "NBS CPI Release List",
        title: "2026年5月份居民消费价格同比下降0.1%",
        occurredAt: "2026-06-01T08:00:00Z",
        infoType: "news_announcement",
        content: {
          url: "https://www.stats.gov.cn/sj/zxfb/202606/t20260601_1958001.html",
          publisher: "国家统计局",
          category: "macro_release",
          release_topic: "prices",
          release_topic_label: "价格指标",
          description: "2026年5月份，全国居民消费价格同比下降0.1%。其中，城市持平，农村下降0.4%。",
        },
      },
      {
        id: `${theme.id}-record-2`,
        sourceId: "source-stats-cpi-release",
        sourceName: "NBS CPI Release List",
        title: "2026年4月份居民消费价格同比下降0.1%",
        occurredAt: "2026-05-01T08:00:00Z",
        infoType: "news_announcement",
        content: {
          url: "https://www.stats.gov.cn/sj/zxfb/202605/t20260501_1957001.html",
          publisher: "国家统计局",
          category: "macro_release",
          release_topic: "prices",
          release_topic_label: "价格指标",
          description: "2026年4月份，全国居民消费价格同比下降0.1%。",
        },
      },
    ];
  }

  if (theme.id === "theme-cn-hk-market-overview") {
    return [
      {
        id: `${theme.id}-record-a-1`,
        sourceId: "source-cn-hk-market-overview",
        sourceName: "Eastmoney China / Hong Kong Market Overview",
        title: "A股市场收盘概览",
        occurredAt: "2026-06-15T15:00:00+08:00",
        infoType: "financial_event",
        content: {
          event_class: "market_overview",
          market_region: "a_share",
          market_label: "A股",
          direction_label: "bullish",
          benchmark_name: "A股核心指数均值",
          benchmark_change_percent: 1.88,
          fund_flow_direction: "inflow",
          fund_flow_net_billion: 18.4,
          fund_flow_turnover_billion: 1124.6,
          fund_flow_currency: "CNY",
          major_indices: [
            { code: "000001", label: "上证指数", latest: 4083.43, change_percent: 1.29 },
            { code: "399001", label: "深证成指", latest: 15266.61, change_percent: 2.03 },
            { code: "399006", label: "创业板指", latest: 3919.62, change_percent: 2.33 },
          ],
          sector_flows: [
            { code: "BK1201", label: "电子", change_percent: 4.35, net_inflow_billion: 184.77, leading_stock_name: "东山精密", leading_stock_code: "002384" },
            { code: "BK1036", label: "半导体", change_percent: 3.99, net_inflow_billion: 67.86, leading_stock_name: "兆易创新", leading_stock_code: "603986" },
            { code: "BK1203", label: "非银金融", change_percent: 2.35, net_inflow_billion: 29.65, leading_stock_name: "东方财富", leading_stock_code: "300059" },
          ],
          top_movers: [
            { code: "301566", label: "达利凯普", latest: 36.64, change_percent: 20.01, turnover_billion: 11.93 },
            { code: "300726", label: "宏达电子", latest: 72.41, change_percent: 20.0, turnover_billion: 17.41 },
            { code: "300570", label: "太辰光", latest: 222.1, change_percent: 20.0, turnover_billion: 61.78 },
          ],
          top_decliners: [
            { code: "600000", label: "示例回调股A", latest: 12.44, change_percent: -6.21, turnover_billion: 8.42 },
            { code: "000001", label: "示例回调股B", latest: 9.88, change_percent: -5.74, turnover_billion: 6.35 },
          ],
          summary_points: [
            "三大指数集体收涨，成长风格表现更强。",
            "北向资金维持净流入，风险偏好有所修复。",
          ],
          description: "A股主要指数集体收涨，北向资金保持净流入，全天情绪偏强。",
        },
      },
      {
        id: `${theme.id}-record-hk-1`,
        sourceId: "source-cn-hk-market-overview",
        sourceName: "Eastmoney China / Hong Kong Market Overview",
        title: "港股市场收盘概览",
        occurredAt: "2026-06-15T16:00:00+08:00",
        infoType: "financial_event",
        content: {
          event_class: "market_overview",
          market_region: "hk",
          market_label: "港股",
          direction_label: "neutral",
          benchmark_name: "港股核心指数均值",
          benchmark_change_percent: 0.72,
          fund_flow_direction: "inflow",
          fund_flow_net_billion: 20.51,
          fund_flow_turnover_billion: 323.26,
          fund_flow_currency: "HKD",
          major_indices: [
            { code: "HSI", label: "恒生指数", latest: 24921.38, change_percent: 0.82 },
            { code: "HSCEI", label: "国企指数", latest: 8426.28, change_percent: 0.62 },
          ],
          top_movers: [
            { code: "06658", label: "溜溜梅", latest: 1239.0, change_percent: 184.3, turnover_billion: 3.39 },
            { code: "01985", label: "美高域", latest: 36.9, change_percent: 39.25, turnover_billion: 0.14 },
            { code: "02513", label: "智谱", latest: 14430.0, change_percent: 31.54, turnover_billion: 42.31 },
          ],
          top_decliners: [
            { code: "00999", label: "示例港股回调A", latest: 18.6, change_percent: -7.42, turnover_billion: 1.22 },
            { code: "00888", label: "示例港股回调B", latest: 7.45, change_percent: -5.11, turnover_billion: 0.84 },
          ],
          summary_points: [
            "恒指和国企指数同步收涨，但弹性弱于A股。",
            "南向资金延续净买入，对港股形成托底。",
          ],
          description: "港股核心指数震荡偏强，南向资金保持净买入，市场以修复为主。",
        },
      },
      {
        id: `${theme.id}-record-a-0`,
        sourceId: "source-cn-hk-market-overview",
        sourceName: "Eastmoney China / Hong Kong Market Overview",
        title: "A股市场收盘概览",
        occurredAt: "2026-06-14T15:00:00+08:00",
        infoType: "financial_event",
        content: {
          event_class: "market_overview",
          market_region: "a_share",
          market_label: "A股",
          direction_label: "neutral",
          benchmark_name: "A股核心指数均值",
          benchmark_change_percent: 0.24,
          fund_flow_direction: "outflow",
          fund_flow_net_billion: -6.8,
          fund_flow_turnover_billion: 986.2,
          fund_flow_currency: "CNY",
          major_indices: [
            { code: "000001", label: "上证指数", latest: 4031.20, change_percent: 0.11 },
            { code: "399001", label: "深证成指", latest: 14980.43, change_percent: 0.25 },
            { code: "399006", label: "创业板指", latest: 3848.01, change_percent: 0.36 },
          ],
          sector_flows: [
            { code: "BK0459", label: "元件", change_percent: 7.44, net_inflow_billion: 77.04, leading_stock_name: "东山精密", leading_stock_code: "002384" },
          ],
          top_movers: [
            { code: "301566", label: "达利凯普", latest: 34.11, change_percent: 12.32, turnover_billion: 8.14 },
          ],
          top_decliners: [
            { code: "600002", label: "示例回调股C", latest: 11.92, change_percent: -4.63, turnover_billion: 4.72 },
          ],
          summary_points: [
            "上一交易日指数窄幅震荡。",
            "北向资金小幅流出，市场更偏观望。",
          ],
          description: "前一交易日A股窄幅震荡，北向资金小幅流出。",
        },
      },
      {
        id: `${theme.id}-record-hk-0`,
        sourceId: "source-cn-hk-market-overview",
        sourceName: "Eastmoney China / Hong Kong Market Overview",
        title: "港股市场收盘概览",
        occurredAt: "2026-06-14T16:00:00+08:00",
        infoType: "financial_event",
        content: {
          event_class: "market_overview",
          market_region: "hk",
          market_label: "港股",
          direction_label: "bearish",
          benchmark_name: "港股核心指数均值",
          benchmark_change_percent: -0.86,
          fund_flow_direction: "outflow",
          fund_flow_net_billion: -9.3,
          fund_flow_turnover_billion: 287.4,
          fund_flow_currency: "HKD",
          major_indices: [
            { code: "HSI", label: "恒生指数", latest: 24718.11, change_percent: -0.74 },
            { code: "HSCEI", label: "国企指数", latest: 8342.02, change_percent: -0.98 },
          ],
          top_movers: [
            { code: "00648", label: "京玖康疗(新)", latest: 29.2, change_percent: 22.69, turnover_billion: 0.02 },
          ],
          top_decliners: [
            { code: "00777", label: "示例港股回调C", latest: 6.42, change_percent: -6.21, turnover_billion: 0.31 },
          ],
          summary_points: [
            "前一交易日港股回落更明显。",
            "南向资金小幅流出，修复力度不足。",
          ],
          description: "前一交易日港股整体承压，南向资金也偏流出。",
        },
      },
    ];
  }

  return [];
}

function buildMockThemeTimeline(
  theme: { id: string; type: string },
  events: Array<{ id: string; title: string; signal: string; occurredAt: string; summary: string; eventType?: string }>,
  sources: Array<{ id: string; name: string }>,
): Array<{
  id: string;
  kind: string;
  at: string;
  title: string;
  summary: string;
  meta?: Record<string, unknown>;
}> {
  const sourceName = sources[0]?.name ?? "Unknown Source";

  if (theme.type === "content_update") {
    return [
      {
        id: `${theme.id}-timeline-run-1`,
        kind: "run",
        at: "2026-06-01T07:30:00Z",
        title: "Latest fetch completed",
        summary: "Figma release notes page fetched and parsed successfully.",
        meta: { status: "completed", triggerType: "schedule", sourceName },
      },
      {
        id: `${theme.id}-timeline-event-1`,
        kind: "event",
        at: events[0]?.occurredAt ?? "2026-06-01T07:35:00Z",
        title: events[0]?.title ?? "New content update detected",
        summary: events[0]?.summary ?? "A new product update was detected on the Figma release notes page.",
        meta: {
          signal: events[0]?.signal ?? "content_update",
          eventType: events[0]?.eventType ?? "content_update",
          sourceName,
        },
      },
    ];
  }

  if (theme.type === "news_announcement") {
    return [
      {
        id: `${theme.id}-timeline-run-1`,
        kind: "run",
        at: "2026-06-01T08:05:00Z",
        title: "Latest fetch completed",
        summary: "NBS release list page fetched, detail pages parsed, and normalized.",
        meta: { status: "completed", triggerType: "schedule", sourceName },
      },
      {
        id: `${theme.id}-timeline-event-1`,
        kind: "event",
        at: events[0]?.occurredAt ?? "2026-06-01T08:02:00Z",
        title: events[0]?.title ?? "New official release detected",
        summary: events[0]?.summary ?? "A new official release was published on the NBS site.",
        meta: {
          signal: events[0]?.signal ?? "new_announcement",
          eventType: events[0]?.eventType ?? "new_release",
          sourceName,
        },
      },
    ];
  }

  if (theme.id === "theme-cn-hk-market-overview") {
    return [
      {
        id: `${theme.id}-timeline-run-1`,
        kind: "run",
        at: "2026-06-15T16:05:00+08:00",
        title: "Latest fetch completed",
        summary: "A-share and Hong Kong close snapshots were fetched from Eastmoney.",
        meta: { status: "completed", triggerType: "schedule", sourceName },
      },
      {
        id: `${theme.id}-timeline-event-1`,
        kind: "event",
        at: events[0]?.occurredAt ?? "2026-06-15T16:00:00+08:00",
        title: events[0]?.title ?? "Cross-market snapshot updated",
        summary: events[0]?.summary ?? "The latest A-share and Hong Kong market overview was recorded.",
        meta: {
          signal: events[0]?.signal ?? "bullish",
          eventType: events[0]?.eventType ?? "financial_direction",
          sourceName,
        },
      },
    ];
  }

  return [];
}

function buildMockThemeHistory(theme: { id: string; type: string }): Array<{ at: string; label: string }> {
  if (theme.type === "content_update") {
    return [
      { at: "2026-05-29T07:30:00Z", label: "Bug fix update detected" },
      { at: "2026-05-31T07:30:00Z", label: "Marketing campaign update card added" },
      { at: "2026-06-01T07:35:00Z", label: "New feature release update detected" },
    ];
  }

  if (theme.type === "news_announcement") {
    return [
      { at: "2026-05-01T08:00:00Z", label: "April CPI release detected" },
      { at: "2026-06-01T08:02:00Z", label: "May CPI release detected" },
    ];
  }

  if (theme.type === "financial_event") {
    if (theme.id === "theme-cn-hk-market-overview") {
      return [
        { at: "2026-06-14T16:00:00+08:00", label: "前一交易日A股与港股表现分化" },
        { at: "2026-06-15T15:00:00+08:00", label: "A股收盘概览更新，市场情绪转强" },
        { at: "2026-06-15T16:00:00+08:00", label: "港股收盘概览更新，南向资金继续净流入" },
      ];
    }

    return [
      { at: "2026-05-30T06:00:00Z", label: "Liquidity withdrawal operation recorded" },
      { at: "2026-05-31T06:10:00Z", label: "Neutral open market operation detected" },
      { at: "2026-06-01T06:10:00Z", label: "New liquidity withdrawal signal emitted" },
    ];
  }

  return [
    { at: "2026-05-30T09:30:00Z", label: "Historical snapshot stored" },
    { at: "2026-05-31T09:30:00Z", label: "Minor price decline detected" },
    { at: "2026-06-01T09:31:00Z", label: "30-day low event emitted" },
  ];
}

function buildMockThemeBreakdown(
  theme: { id: string; type: string },
  records: Array<{ content: Record<string, unknown> }>,
): { title: string; description: string; items: Array<{ label: string; count: number }> } | null {
  if (theme.type === "content_update") {
    const counts = new Map<string, number>();
    for (const record of records) {
      const label = String(record.content.update_type ?? "unknown");
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const items = Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
    return {
      title: "Update Type Distribution",
      description: "Aggregate by recent content update types to help you quickly determine if it's feature release, marketing action, or bug fix.",
      items: items.length > 0 ? items : [{ label: "No data", count: 0 }],
    };
  }

  if (theme.type === "news_announcement") {
    const counts = new Map<string, number>();
    for (const record of records) {
      const label = String(record.content.release_topic_label ?? "unknown");
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const items = Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
    return {
      title: "Release Topic Distribution",
      description: "Aggregate by recent official release topics to help you quickly determine the current macro focus areas.",
      items: items.length > 0 ? items : [{ label: "No data", count: 0 }],
    };
  }

  return null;
}

export async function createTheme(input: ThemeInput) {
  const db = getDatabase();

  if (!db) {
    const themeId = input.id?.trim() || createId("theme");
    const sourceIds: string[] = [];
    mockThemes.unshift({
      id: themeId,
      name: input.name,
      type: input.themeType,
      status: "active",
      latestRunAt: new Date().toISOString(),
      latestEventAt: null,
      sourceCount: input.sources?.length ?? 0,
    });

    input.sources?.forEach((source) => {
      const sourceId = createId("source");
      sourceIds.push(sourceId);
      mockSources.push({
        id: sourceId,
        themeId,
        themeName: input.name,
        name: source.name,
        status: "active",
        latestSuccessAt: null,
        latestFailureAt: null,
      });
    });

    return { id: themeId, sourceIds };
  }

  return createThemeInDb(db, input);
}

export async function updateTheme(themeId: string, input: ThemeUpdateInput) {
  const db = getDatabase();

  if (!db) {
    const theme = mockThemes.find((item) => item.id === themeId);

    if (!theme) {
      return null;
    }

    if (input.name !== undefined) {
      const nextName = input.name;
      theme.name = nextName;
      mockSources.forEach((source) => {
        if (source.themeId === themeId) {
          source.themeName = nextName;
        }
      });
      mockEvents.forEach((event) => {
        if (event.themeId === themeId) {
          event.themeName = nextName;
        }
      });
    }

    if (input.description !== undefined) {
      // mock theme summary does not persist description
    }

    if (input.status !== undefined) {
      theme.status = input.status;
    }

    return { id: themeId };
  }

  const existing = await db
    .selectFrom("themes")
    .select(["id"])
    .where("id", "=", themeId)
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

  if (input.description !== undefined) {
    nextValues.description = input.description;
  }

  if (input.status !== undefined) {
    nextValues.status = input.status;
  }

  await db
    .updateTable("themes")
    .set(nextValues)
    .where("id", "=", themeId)
    .execute();

  return { id: themeId };
}

export async function deleteTheme(themeId: string) {
  const db = getDatabase();

  if (!db) {
    const index = mockThemes.findIndex((item) => item.id === themeId);

    if (index === -1) {
      return null;
    }

    mockThemes.splice(index, 1);

    for (let i = mockSources.length - 1; i >= 0; i -= 1) {
      if (mockSources[i].themeId === themeId) {
        mockSources.splice(i, 1);
      }
    }

    for (let i = mockEvents.length - 1; i >= 0; i -= 1) {
      if (mockEvents[i].themeId === themeId) {
        mockEvents.splice(i, 1);
      }
    }

    return { id: themeId };
  }

  const existing = await db
    .selectFrom("themes")
    .select(["id"])
    .where("id", "=", themeId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  await db
    .deleteFrom("themes")
    .where("id", "=", themeId)
    .execute();

  return { id: themeId };
}

// ─── Daily Activity ──────────────────────────────────────────────────────────

export type DailyActivityDay = {
  date: string;
  eventCount: number;
  runCount: number;
  changeCount: number;
  signals: Record<string, number>;
};

export type ThemeDailyActivity = {
  themeId: string;
  days: DailyActivityDay[];
  totals: {
    events: number;
    runs: number;
    changes: number;
  };
  signalDistribution?: Record<string, number>;
  dayOverDay?: {
    eventsDelta: number;
    runsDelta: number;
    trend: "up" | "down" | "flat";
  };
};

export async function getThemeDailyActivity(
  themeId: string,
  days: number = 7,
): Promise<ThemeDailyActivity | null> {
  const db = getDatabase();
  const now = new Date();

  // Helper to get date string in Asia/Shanghai timezone
  function toCstDate(date: Date): string {
    return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
  }

  if (!db) {
    // Mock mode: generate synthetic daily activity
    const themeEvents = mockEvents.filter((e) => e.themeId === themeId);
    const dayList: DailyActivityDay[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = toCstDate(dayDate);
      const dayEvents = themeEvents.filter((e) => e.occurredAt.startsWith(dateStr));
      const signals: Record<string, number> = {};
      for (const e of dayEvents) {
        signals[e.signal] = (signals[e.signal] ?? 0) + 1;
      }
      dayList.push({
        date: dateStr,
        eventCount: dayEvents.length,
        runCount: i === 0 ? 1 : 0,
        changeCount: dayEvents.length > 0 ? 1 : 0,
        signals,
      });
    }

    // Signal distribution (Task 10)
    const signalDistribution: Record<string, number> = {};
    for (const day of dayList) {
      for (const [signal, count] of Object.entries(day.signals)) {
        signalDistribution[signal] = (signalDistribution[signal] ?? 0) + count;
      }
    }

    // Day-over-day comparison
    let dayOverDay: ThemeDailyActivity["dayOverDay"];
    if (dayList.length >= 2) {
      const today = dayList[dayList.length - 1];
      const yesterday = dayList[dayList.length - 2];
      const eventsDelta = today.eventCount - yesterday.eventCount;
      dayOverDay = {
        eventsDelta,
        runsDelta: today.runCount - yesterday.runCount,
        trend: eventsDelta > 0 ? "up" : eventsDelta < 0 ? "down" : "flat",
      };
    }

    return {
      themeId,
      days: dayList,
      totals: {
        events: themeEvents.length,
        runs: 1,
        changes: themeEvents.length > 0 ? 1 : 0,
      },
      signalDistribution: Object.keys(signalDistribution).length > 0 ? signalDistribution : undefined,
      dayOverDay,
    };
  }

  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [events, runs, changes] = await Promise.all([
    db
      .selectFrom("events")
      .select(["occurred_at as occurredAt", "signal"])
      .where("theme_id", "=", themeId)
      .where("occurred_at", ">=", startDate as any)
      .execute(),
    db
      .selectFrom("source_runs")
      .select(["created_at as createdAt"])
      .where("theme_id", "=", themeId)
      .where("created_at", ">=", startDate as any)
      .where("trigger_type", "!=", "test")
      .execute(),
    db
      .selectFrom("changes")
      .select(["detected_at as detectedAt"])
      .where("theme_id", "=", themeId)
      .where("detected_at", ">=", startDate as any)
      .execute(),
  ]);

  // Group by day using Asia/Shanghai timezone
  const dayMap = new Map<string, DailyActivityDay>();

  for (let i = days - 1; i >= 0; i--) {
    const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = toCstDate(dayDate);
    dayMap.set(dateStr, { date: dateStr, eventCount: 0, runCount: 0, changeCount: 0, signals: {} });
  }

  for (const event of events) {
    const dateStr = toCstDate(event.occurredAt instanceof Date ? event.occurredAt : new Date(String(event.occurredAt)));
    const day = dayMap.get(dateStr);
    if (day) {
      day.eventCount += 1;
      day.signals[event.signal] = (day.signals[event.signal] ?? 0) + 1;
    }
  }

  for (const run of runs) {
    const dateStr = toCstDate(run.createdAt instanceof Date ? run.createdAt : new Date(String(run.createdAt)));
    const day = dayMap.get(dateStr);
    if (day) day.runCount += 1;
  }

  for (const change of changes) {
    const dateStr = toCstDate(change.detectedAt instanceof Date ? change.detectedAt : new Date(String(change.detectedAt)));
    const day = dayMap.get(dateStr);
    if (day) day.changeCount += 1;
  }

  const dayList = Array.from(dayMap.values());

  // Signal distribution across all days (Task 10)
  const signalDistribution: Record<string, number> = {};
  for (const day of dayList) {
    for (const [signal, count] of Object.entries(day.signals)) {
      signalDistribution[signal] = (signalDistribution[signal] ?? 0) + count;
    }
  }

  // Day-over-day comparison: compare last 2 days (Task 10)
  let dayOverDay: ThemeDailyActivity["dayOverDay"];
  if (dayList.length >= 2) {
    const today = dayList[dayList.length - 1];
    const yesterday = dayList[dayList.length - 2];
    const eventsDelta = today.eventCount - yesterday.eventCount;
    const runsDelta = today.runCount - yesterday.runCount;
    dayOverDay = {
      eventsDelta,
      runsDelta,
      trend: eventsDelta > 0 ? "up" : eventsDelta < 0 ? "down" : "flat",
    };
  }

  return {
    themeId,
    days: dayList,
    totals: {
      events: events.length,
      runs: runs.length,
      changes: changes.length,
    },
    signalDistribution: Object.keys(signalDistribution).length > 0 ? signalDistribution : undefined,
    dayOverDay,
  };
}

export async function getThemeReviewNote(themeId: string): Promise<ThemeReviewNote | null> {
  const db = getDatabase();

  if (!db) {
    // Mock mode - read review note from in-memory theme metadata
    const theme = mockThemes.find((t) => t.id === themeId);
    if (!theme) {
      return null;
    }

    const metadata = (theme as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
    const reviewNote = metadata?.reviewNote as Record<string, unknown> | undefined;

    return {
      content: typeof reviewNote?.content === "string" ? reviewNote.content : "",
      updatedAt: typeof reviewNote?.updatedAt === "string" ? reviewNote.updatedAt : null,
      status: typeof reviewNote?.status === "string" ? reviewNote.status as ThemeReviewNote["status"] : undefined,
      tags: Array.isArray(reviewNote?.tags) ? reviewNote.tags as string[] : undefined,
      nextReviewDate: typeof reviewNote?.nextReviewDate === "string" ? reviewNote.nextReviewDate : null,
    };
  }

  const theme = await db
    .selectFrom("themes")
    .select(["id", "metadata"])
    .where("id", "=", themeId)
    .executeTakeFirst();

  if (!theme) {
    return null;
  }

  // Guard against metadata being returned as a raw JSON string by the driver
  const rawMetadata = theme.metadata;
  let metadata: Record<string, unknown> = {};
  try {
    metadata =
      typeof rawMetadata === "string"
        ? JSON.parse(rawMetadata)
        : (rawMetadata as Record<string, unknown>) ?? {};
  } catch {
    metadata = {};
  }
  const reviewNote = metadata.reviewNote as Record<string, unknown> | undefined;

  return {
    content: typeof reviewNote?.content === "string" ? reviewNote.content : "",
    updatedAt: typeof reviewNote?.updatedAt === "string" ? reviewNote.updatedAt : null,
    status: typeof reviewNote?.status === "string" ? reviewNote.status as ThemeReviewNote["status"] : undefined,
    tags: Array.isArray(reviewNote?.tags) ? reviewNote.tags as string[] : undefined,
    nextReviewDate: typeof reviewNote?.nextReviewDate === "string" ? reviewNote.nextReviewDate : null,
  };
}

export async function updateThemeReviewNote(
  themeId: string,
  input: ThemeReviewNoteUpdate,
): Promise<ThemeReviewNote | null> {
  const db = getDatabase();

  if (!db) {
    // Mock mode - persist review note to in-memory theme metadata
    const theme = mockThemes.find((t) => t.id === themeId);
    if (!theme) {
      return null;
    }

    const now = new Date().toISOString();
    const themeRecord = theme as Record<string, unknown>;
    const metadata = (themeRecord.metadata as Record<string, unknown>) ?? {};
    metadata.reviewNote = {
      content: input.content,
      updatedAt: now,
      status: input.status,
      tags: input.tags,
      nextReviewDate: input.nextReviewDate,
    };
    themeRecord.metadata = metadata;

    return {
      content: input.content,
      updatedAt: now,
      status: input.status,
      tags: input.tags,
      nextReviewDate: input.nextReviewDate,
    };
  }

  const existing = await db
    .selectFrom("themes")
    .select(["id", "metadata"])
    .where("id", "=", themeId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  // Guard against metadata being returned as a raw JSON string by the driver
  const rawMetadata = existing.metadata;
  let currentMetadata: Record<string, unknown> = {};
  try {
    currentMetadata =
      typeof rawMetadata === "string"
        ? JSON.parse(rawMetadata)
        : (rawMetadata as Record<string, unknown>) ?? {};
  } catch {
    currentMetadata = {};
  }
  const now = new Date().toISOString();

  const updatedMetadata = {
    ...currentMetadata,
    reviewNote: {
      content: input.content,
      updatedAt: now,
      status: input.status,
      tags: input.tags,
      nextReviewDate: input.nextReviewDate,
    },
  };

  await db
    .updateTable("themes")
    .set({
      metadata: JSON.stringify(updatedMetadata),
      updated_at: now,
    })
    .where("id", "=", themeId)
    .execute();

  return {
    content: input.content,
    updatedAt: now,
    status: input.status,
    tags: input.tags,
    nextReviewDate: input.nextReviewDate,
  };
}

// ─── Price Comparison (Task 4) ───────────────────────────────────────────────

export type PriceComparisonItem = {
  spec: string;
  sources: Array<{
    sourceId: string;
    sourceName: string;
    price: number;
    currency: string;
    occurredAt: string;
    isOutlier: boolean;
    outlierReason: string | null;
  }>;
  lowest: { price: number; sourceName: string } | null;
  latest: { price: number; sourceName: string } | null;
  priceGap: number | null; // percentage difference between lowest and highest
  hasSuspiciousOutlier: boolean;
};

export type PriceComparisonResult = {
  themeId: string;
  themeName: string;
  items: PriceComparisonItem[];
  summary: {
    totalSpecs: number;
    specsWithMultipleSources: number;
    outlierCount: number;
  };
};

export async function getPriceComparison(themeId: string): Promise<PriceComparisonResult | null> {
  const db = getDatabase();

  if (!db) {
    // Mock mode: build comparison from mock records
    const theme = mockThemes.find((t) => t.id === themeId);
    if (!theme || theme.type !== "price") return null;

    const themeRecords = mockEvents
      .filter((e) => e.themeId === themeId)
      .map((e) => ({
        sourceId: "mock-source",
        sourceName: "Mock Source",
        content: e.context ?? {},
        occurredAt: e.occurredAt,
      }));

    return buildPriceComparison(themeId, theme.name, themeRecords);
  }

  // DB mode
  const theme = await db
    .selectFrom("themes")
    .select(["id", "name", "info_type"])
    .where("id", "=", themeId)
    .executeTakeFirst();

  if (!theme || theme.info_type !== "price") return null;

  const records = await db
    .selectFrom("normalized_records as nr")
    .innerJoin("sources as s", "s.id", "nr.source_id")
    .select([
      "nr.source_id as sourceId",
      "s.name as sourceName",
      "nr.content",
      "nr.occurred_at as occurredAt",
    ])
    .where("nr.theme_id", "=", themeId)
    .orderBy("nr.occurred_at desc")
    .limit(200)
    .execute();

  const mapped = records.map((r) => ({
    sourceId: r.sourceId,
    sourceName: r.sourceName,
    content: r.content as Record<string, unknown>,
    occurredAt: r.occurredAt instanceof Date ? r.occurredAt.toISOString() : String(r.occurredAt),
  }));

  return buildPriceComparison(themeId, theme.name, mapped);
}

function buildPriceComparison(
  themeId: string,
  themeName: string,
  records: Array<{
    sourceId: string;
    sourceName: string;
    content: Record<string, unknown>;
    occurredAt: string;
  }>,
): PriceComparisonResult {
  // Group by spec
  const specMap = new Map<
    string,
    Array<{
      sourceId: string;
      sourceName: string;
      price: number;
      currency: string;
      occurredAt: string;
      isOutlier: boolean;
      outlierReason: string | null;
    }>
  >();

  for (const record of records) {
    const spec = String(record.content.spec || "default");
    const price = Number(record.content.price);
    if (!Number.isFinite(price) || price <= 0) continue;

    if (!specMap.has(spec)) specMap.set(spec, []);
    specMap.get(spec)!.push({
      sourceId: record.sourceId,
      sourceName: record.sourceName,
      price,
      currency: String(record.content.currency || "CNY"),
      occurredAt: record.occurredAt,
      isOutlier: Boolean(record.content.is_outlier),
      outlierReason: record.content.outlier_reason ? String(record.content.outlier_reason) : null,
    });
  }

  const items: PriceComparisonItem[] = [];

  for (const [spec, sources] of specMap) {
    // Deduplicate by source, keep latest
    const latestBySource = new Map<string, (typeof sources)[0]>();
    for (const src of sources) {
      const existing = latestBySource.get(src.sourceId);
      if (!existing || src.occurredAt > existing.occurredAt) {
        latestBySource.set(src.sourceId, src);
      }
    }

    const uniqueSources = Array.from(latestBySource.values());
    const prices = uniqueSources.map((s) => s.price);
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    // Cap priceGap at 10000% to avoid displaying misleading numbers for placeholder/test listings
    const rawGap = lowestPrice > 0 ? ((highestPrice - lowestPrice) / lowestPrice) * 100 : null;
    const priceGap = rawGap !== null ? Math.min(rawGap, 10000) : null;

    const lowest = uniqueSources.find((s) => s.price === lowestPrice) ?? null;
    const latest = uniqueSources.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0] ?? null;

    items.push({
      spec,
      sources: uniqueSources,
      lowest: lowest ? { price: lowest.price, sourceName: lowest.sourceName } : null,
      latest: latest ? { price: latest.price, sourceName: latest.sourceName } : null,
      priceGap,
      hasSuspiciousOutlier: uniqueSources.some((s) => s.isOutlier),
    });
  }

  return {
    themeId,
    themeName,
    items,
    summary: {
      totalSpecs: items.length,
      specsWithMultipleSources: items.filter((i) => i.sources.length > 1).length,
      outlierCount: items.filter((i) => i.hasSuspiciousOutlier).length,
    },
  };
}
