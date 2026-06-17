import type { EventSummary, SourceStatus, ThemeSummary } from "./api";
import { eventImpactTone } from "./impact";
import { workspaceDefinitions } from "../workspaces/catalog";
import type { WorkspaceDefinition, WorkspaceId } from "../workspaces/types";

export type { WorkspaceDefinition, WorkspaceId };
export { workspaceDefinitions };

export type WorkspaceDataset = {
  workspace: WorkspaceDefinition;
  themes: ThemeSummary[];
  events: EventSummary[];
  sources: SourceStatus[];
};

export type WorkspaceStatus = "stable" | "active" | "alert";
export type WorkspacePriority = "critical" | "high" | "normal";

export type WorkspaceSummary = {
  activeTopics: number;
  newMessages: number;
  majorEvents: number;
  focusEvents: number;
  openActions: number;
  warningSources: number;
  updatedAt: string | null;
  status: WorkspaceStatus;
};

const marketKeywords = [
  "央行",
  "统计局",
  "cpi",
  "ppi",
  "open market",
  "eastmoney",
  "quote",
  "kline",
  "stock",
  "liquidity",
  "macro",
  "债",
  "股",
  "汇率",
  "利率",
  "指数",
];

const investmentKeywords = [
  "黄金",
  "白银",
  "金条",
  "金币",
  "纪念币",
  "基金",
  "etf",
  "股票",
  "债券",
  "期货",
  "外汇",
  "比特币",
  "投资",
  "理财",
];

const stockKeywords = [
  "a股",
  "港股",
  "沪深",
  "上交所",
  "深交所",
  "港交所",
  "龙虎榜",
  "恒生",
  "国企指数",
  "创业板",
  "上证",
  "深证",
  "股票",
  "个股",
  "茅台",
  "kline",
  "market overview",
  "northbound",
  "southbound",
];

const competitorKeywords = [
  "release notes",
  "product updates",
  "竞品",
  "版本",
  "功能",
  "更新",
  "活动",
  "campaign",
  "figma",
];

const goodsKeywords = [
  "闲鱼",
  "转转",
  "price",
  "二手",
  "库存",
  "供给",
  "商品",
  "marketplace",
  "surface",
  "iphone",
];

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function sourceText(source: SourceStatus) {
  return normalizeText([
    source.name,
    source.sourceType,
    source.adapterKey,
    source.themeName,
    source.themeType,
  ].filter(Boolean).join(" "));
}

function themeText(theme: ThemeSummary) {
  return normalizeText([
    theme.name,
    theme.type,
    theme.latestEventTitle,
    theme.latestEventSignal,
    theme.latestInsight,
  ].filter(Boolean).join(" "));
}

function eventText(event: EventSummary) {
  return normalizeText([
    event.title,
    event.summary,
    event.signal,
    event.infoType,
  ].filter(Boolean).join(" "));
}

function sourceLooksLikeMarket(source: SourceStatus) {
  const text = sourceText(source);
  return includesAny(text, marketKeywords) || includesAny(text, investmentKeywords);
}

function sourceLooksLikeStock(source: SourceStatus) {
  const text = sourceText(source);
  return (
    includesAny(text, stockKeywords) ||
    source.adapterKey === "eastmoney_stock_kline" ||
    source.adapterKey === "eastmoney_market_overview"
  );
}

function sourceLooksLikeCompetitor(source: SourceStatus) {
  return includesAny(sourceText(source), competitorKeywords);
}

function sourceLooksLikeGoods(source: SourceStatus) {
  return includesAny(sourceText(source), goodsKeywords);
}

function themeLooksLikeMarket(theme: ThemeSummary, events: EventSummary[], sources: SourceStatus[]) {
  if (theme.type === "financial_event") {
    if (sources.some(sourceLooksLikeStock) || includesAny(themeText(theme), stockKeywords)) {
      return false;
    }

    return true;
  }

  if (theme.type === "price" && sources.some(sourceLooksLikeMarket)) {
    return true;
  }

  if (includesAny(themeText(theme), marketKeywords)) {
    return true;
  }

  return events.some((event) => includesAny(eventText(event), marketKeywords) || includesAny(eventText(event), investmentKeywords));
}

function themeLooksLikeStock(theme: ThemeSummary, events: EventSummary[], sources: SourceStatus[]) {
  if (sources.some(sourceLooksLikeStock)) {
    return true;
  }

  if (includesAny(themeText(theme), stockKeywords)) {
    return true;
  }

  if (events.some((event) => includesAny(eventText(event), stockKeywords))) {
    return true;
  }

  if (theme.type === "price" && sources.some(sourceLooksLikeMarket)) {
    return true;
  }

  return false;
}

function themeLooksLikeCompetitor(theme: ThemeSummary, events: EventSummary[], sources: SourceStatus[]) {
  if (theme.type === "content_update") {
    return true;
  }

  if (sources.some(sourceLooksLikeCompetitor)) {
    return true;
  }

  if (includesAny(themeText(theme), competitorKeywords)) {
    return true;
  }

  return events.some((event) => includesAny(eventText(event), competitorKeywords));
}

function themeLooksLikeGoods(theme: ThemeSummary, events: EventSummary[], sources: SourceStatus[]) {
  if (theme.type === "price" && !sources.some(sourceLooksLikeMarket)) {
    return true;
  }

  if (sources.some(sourceLooksLikeGoods)) {
    return true;
  }

  if (includesAny(themeText(theme), goodsKeywords)) {
    if (includesAny(themeText(theme), investmentKeywords)) {
      return false;
    }
    return true;
  }

  return events.some((event) => includesAny(eventText(event), goodsKeywords) && !includesAny(eventText(event), investmentKeywords));
}

export function getWorkspaceDefinition(workspaceId?: string | null) {
  return workspaceDefinitions.find((workspace) => workspace.id === workspaceId) ?? null;
}

export function classifyThemeWorkspace(
  theme: ThemeSummary,
  relatedEvents: EventSummary[] = [],
  relatedSources: SourceStatus[] = [],
): WorkspaceId {
  if (themeLooksLikeCompetitor(theme, relatedEvents, relatedSources)) {
    return "competitor-watch";
  }

  if (themeLooksLikeStock(theme, relatedEvents, relatedSources)) {
    return "stock-market";
  }

  if (themeLooksLikeMarket(theme, relatedEvents, relatedSources)) {
    return "market-impact";
  }

  if (themeLooksLikeGoods(theme, relatedEvents, relatedSources)) {
    return "goods-supply";
  }

  if (theme.type === "news_announcement") {
    return "market-impact";
  }

  return "goods-supply";
}

export function buildWorkspaceDataset(
  workspaceId: WorkspaceId,
  themes: ThemeSummary[],
  events: EventSummary[],
  sources: SourceStatus[],
): WorkspaceDataset {
  const themeWorkspaceMap = new Map<string, WorkspaceId>();

  for (const theme of themes) {
    const relatedEvents = events.filter((event) => event.themeId === theme.id);
    const relatedSources = sources.filter((source) => source.themeId === theme.id);
    themeWorkspaceMap.set(theme.id, classifyThemeWorkspace(theme, relatedEvents, relatedSources));
  }

  const scopedThemes = themes.filter((theme) => themeWorkspaceMap.get(theme.id) === workspaceId);
  const themeIds = new Set(scopedThemes.map((theme) => theme.id));
  const scopedEvents = events.filter((event) => themeIds.has(event.themeId));
  const scopedSources = sources.filter((source) => themeIds.has(source.themeId));

  return {
    workspace: getWorkspaceDefinition(workspaceId) ?? workspaceDefinitions[0],
    themes: scopedThemes,
    events: scopedEvents,
    sources: scopedSources,
  };
}

export function workspaceReferenceNow(dataset: Pick<WorkspaceDataset, "themes" | "events" | "sources">) {
  const timestamps = [
    ...dataset.themes.flatMap((theme) => [theme.latestRunAt, theme.latestEventAt]),
    ...dataset.events.flatMap((event) => [event.occurredAt, event.bookmarkedAt]),
    ...dataset.sources.flatMap((source) => [
      source.latestRunAt,
      source.latestSuccessAt,
      source.latestFailureAt,
    ]),
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  return new Date(timestamps.length ? Math.max(...timestamps) : Date.now());
}

export function scoreWorkspaceEventPriority(
  event: EventSummary,
  nowValue: Date,
): { level: WorkspacePriority; score: number } {
  let score = 0;

  if (event.status === "open") {
    score += 3;
  } else if (event.status === "tracking") {
    score += 2;
  }

  if (!event.isRead) {
    score += 2;
  }

  if (event.isBookmarked) {
    score += 1;
  }

  const occurredAt = new Date(event.occurredAt).getTime();
  if (!Number.isNaN(occurredAt)) {
    const hours = (nowValue.getTime() - occurredAt) / (60 * 60 * 1000);
    if (hours <= 24) {
      score += 2;
    } else if (hours <= 72) {
      score += 1;
    }
  }

  switch (event.infoType) {
    case "financial_event":
      score += 3;
      break;
    case "news_announcement":
      score += 2;
      break;
    case "price":
      score += 2;
      break;
    case "content_update":
      score += 2;
      break;
    default:
      break;
  }

  switch (event.signal) {
    case "liquidity_withdrawal":
    case "liquidity_injection":
      score += 3;
      break;
    case "new_announcement":
    case "30d_low":
    case "content_update":
      score += 2;
      break;
    default:
      break;
  }

  if (score >= 9) {
    return { level: "critical", score };
  }

  if (score >= 6) {
    return { level: "high", score };
  }

  return { level: "normal", score };
}

export function workspacePriorityLabel(level: WorkspacePriority) {
  switch (level) {
    case "critical":
      return "重大事件";
    case "high":
      return "重点关注";
    default:
      return "常规观察";
  }
}

export function workspaceStatusLabel(status: WorkspaceStatus) {
  switch (status) {
    case "alert":
      return "预警";
    case "active":
      return "活跃";
    default:
      return "平稳";
  }
}

export function workspaceStatusTone(status: WorkspaceStatus) {
  switch (status) {
    case "alert":
      return "negative";
    case "active":
      return "warning";
    default:
      return "positive";
  }
}

export function buildWorkspaceSummary(dataset: WorkspaceDataset): WorkspaceSummary {
  const nowValue = workspaceReferenceNow(dataset);
  const threshold = nowValue.getTime() - 24 * 60 * 60 * 1000;
  const scoredEvents = dataset.events.map((event) => ({
    event,
    priority: scoreWorkspaceEventPriority(event, nowValue),
  }));

  const newMessages = dataset.events.filter((event) => {
    const time = new Date(event.occurredAt).getTime();
    return !Number.isNaN(time) && time >= threshold;
  }).length;

  const majorEvents = scoredEvents.filter((item) => item.priority.level === "critical").length;
  const focusEvents = scoredEvents.filter((item) => item.priority.level !== "normal").length;
  const openActions = dataset.events.filter((event) => event.status === "open" || !event.isRead).length;
  const warningSources = dataset.sources.filter((source) => source.status === "warning").length;
  const updatedAt = [
    ...dataset.themes.flatMap((theme) => [theme.latestEventAt, theme.latestRunAt]),
    ...dataset.sources.flatMap((source) => [source.latestRunAt, source.latestSuccessAt]),
  ]
    .filter((value): value is string => typeof value === "string")
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  let status: WorkspaceStatus = "stable";
  if (majorEvents > 0 || warningSources > 0) {
    status = "alert";
  } else if (focusEvents > 0 || newMessages > 0) {
    status = "active";
  }

  return {
    activeTopics: dataset.themes.filter((theme) => theme.status !== "archived").length,
    newMessages,
    majorEvents,
    focusEvents,
    openActions,
    warningSources,
    updatedAt,
    status,
  };
}

export function sortWorkspaceEvents(events: EventSummary[]) {
  const eventTimes = events
    .map((event) => new Date(event.occurredAt).getTime())
    .filter((value) => !Number.isNaN(value));
  const nowValue = new Date(eventTimes.length ? Math.max(...eventTimes) : Date.now());

  return [...events].sort((left, right) => {
    const rightPriority = scoreWorkspaceEventPriority(right, nowValue);
    const leftPriority = scoreWorkspaceEventPriority(left, nowValue);

    if (rightPriority.score !== leftPriority.score) {
      return rightPriority.score - leftPriority.score;
    }

    return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
  });
}

export function workspaceTopicHealthTone(theme: ThemeSummary) {
  if (theme.sourceHealth === "warning") {
    return "negative";
  }

  if (theme.status === "paused") {
    return "warning";
  }

  return eventImpactTone({
    infoType: theme.type,
    signal: theme.latestEventSignal,
  });
}
