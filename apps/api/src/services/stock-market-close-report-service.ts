import type { StockMarketCloseReport, StockMarketCloseReportSnapshot, ThemeMarketOverview, ThemeMarketMover } from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";
import { getThemeDetail } from "./theme-service.js";

const STOCK_MARKET_WORKSPACE_ID = "stock-market";
const STOCK_MARKET_THEME_ID = "theme-cn-hk-market-overview";

function requireDatabase() {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  return db;
}

function toCstDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
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

type AnnouncementCandidate = {
  themeId: string;
  title: string;
  summary: string;
  themeName: string;
  occurredAt: string;
};

type AnnouncementClue = {
  level: "high" | "medium" | "low";
  title: string;
  summary: string;
  score: number;
  targetThemeId?: string | null;
};

type SupportingEvent = {
  themeId: string;
  title: string;
  summary: string;
  themeName: string;
  infoType: string | null;
  occurredAt: string;
};

type ReportMoverCard = StockMarketCloseReport["moverCards"][number];
type MoverDirection = "up" | "down";
type SupportingClue = {
  level: "high" | "medium" | "low";
  title: string;
  summary: string;
  score: number;
  targetThemeId?: string | null;
};
type RankedClue = {
  level: "high" | "medium" | "low";
  title: string;
  summary: string;
  targetThemeId?: string | null;
};

const POSITIVE_ANNOUNCEMENT_KEYWORDS = ["回购", "增持", "中标", "签约", "合作", "预增", "分红", "获批", "突破", "订单"];
const NEGATIVE_ANNOUNCEMENT_KEYWORDS = ["减持", "问询", "处罚", "诉讼", "亏损", "终止", "风险", "违约", "退市", "下修"];

async function loadRecentAnnouncementCandidates(): Promise<AnnouncementCandidate[]> {
  const db = requireDatabase();

  const rows = await db
    .selectFrom("events as e")
    .innerJoin("themes as t", "t.id", "e.theme_id")
    .select([
      "e.title as title",
      "e.summary as summary",
      "e.theme_id as themeId",
      "t.name as themeName",
      "e.occurred_at as occurredAt",
    ])
    .where("t.info_type", "=", "news_announcement")
    .orderBy("e.occurred_at desc")
    .limit(80)
    .execute();

  return rows.map((row) => ({
    themeId: row.themeId,
    title: row.title,
    summary: row.summary,
    themeName: row.themeName,
    occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : String(row.occurredAt),
  }));
}

async function loadRecentSupportingEvents(): Promise<SupportingEvent[]> {
  const db = requireDatabase();
  const stockKeywords = ["龙虎榜", "上交所", "深交所", "港交所", "公告", "A股", "港股", "沪深"];

  const rows = await db
    .selectFrom("events as e")
    .innerJoin("themes as t", "t.id", "e.theme_id")
    .select([
      "e.title as title",
      "e.summary as summary",
      "t.name as themeName",
      "t.info_type as infoType",
      "e.occurred_at as occurredAt",
      "e.theme_id as themeId",
    ])
    .where("e.theme_id", "!=", STOCK_MARKET_THEME_ID)
    .orderBy("e.occurred_at desc")
    .limit(80)
    .execute();

  return rows
    .filter((row) => {
      const text = `${row.title} ${row.summary} ${row.themeName}`.toLowerCase();
      return stockKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
    })
    .map((row) => ({
      title: row.title,
      summary: row.summary,
      themeId: row.themeId,
      themeName: row.themeName,
      infoType: row.infoType,
      occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : String(row.occurredAt),
    }));
}

function buildAnnouncementHintForMover(
  mover: ThemeMarketMover,
  announcements: AnnouncementCandidate[],
  moverOccurredAt: string,
  direction: MoverDirection,
): AnnouncementClue | null {
  const code = mover.code?.trim().toLowerCase();
  const label = mover.label?.trim().toLowerCase();
  const moverTime = new Date(moverOccurredAt).getTime();
  const directionKeywords = direction === "up" ? POSITIVE_ANNOUNCEMENT_KEYWORDS : NEGATIVE_ANNOUNCEMENT_KEYWORDS;

  const candidates = announcements
    .map((item) => {
      const haystack = `${item.title} ${item.summary} ${item.themeName}`.toLowerCase();
      if (!(label && haystack.includes(label) || code && haystack.includes(code))) {
        return null;
      }

      const occurredAt = new Date(item.occurredAt).getTime();
      const hoursDiff = Number.isNaN(occurredAt) || Number.isNaN(moverTime)
        ? 999
        : (moverTime - occurredAt) / (60 * 60 * 1000);

      // Keep a narrow causal window: from 48h before close to 8h after.
      if (hoursDiff < -8 || hoursDiff > 48) {
        return null;
      }

      let score = 0;
      if (label && item.title.toLowerCase().includes(label)) score += 4;
      else if (label && haystack.includes(label)) score += 2;
      if (code && haystack.includes(code)) score += 3;
      if (hoursDiff >= 0 && hoursDiff <= 12) score += 3;
      else if (hoursDiff <= 24) score += 2;
      else score += 1;
      if ((mover.changePercent ?? 0) >= 9 || (mover.changePercent ?? 0) <= -7) score += 1;
      if (directionKeywords.some((keyword) => haystack.includes(keyword))) score += 2;

      return {
        item,
        score,
      };
    })
    .filter((item): item is { item: AnnouncementCandidate; score: number } => Boolean(item))
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];
  if (!best) {
    return null;
  }

  const level: AnnouncementClue["level"] =
    best.score >= 8 ? "high" : best.score >= 5 ? "medium" : "low";

  return {
    level,
    title: best.item.title,
    summary: `相关公告线索，主题 ${best.item.themeName}，公告时间 ${best.item.occurredAt.slice(0, 10)}。`,
    score: best.score,
    targetThemeId: best.item.themeId,
  };
}

function buildSupportingCluesForMover(
  mover: ThemeMarketMover,
  supportingEvents: SupportingEvent[],
  moverOccurredAt: string,
  direction: MoverDirection,
): SupportingClue[] {
  const code = mover.code?.trim().toLowerCase();
  const label = mover.label?.trim().toLowerCase();
  const moverTime = new Date(moverOccurredAt).getTime();
  const directionKeywords = direction === "up" ? POSITIVE_ANNOUNCEMENT_KEYWORDS : NEGATIVE_ANNOUNCEMENT_KEYWORDS;
  const candidates: SupportingClue[] = [];

  for (const event of supportingEvents) {
    const haystack = `${event.title} ${event.summary} ${event.themeName}`.toLowerCase();
    const occurredAt = new Date(event.occurredAt).getTime();
    const hoursDiff = Number.isNaN(occurredAt) || Number.isNaN(moverTime)
      ? 999
      : (moverTime - occurredAt) / (60 * 60 * 1000);

    if (!(hoursDiff >= -8 && hoursDiff <= 48)) {
      continue;
    }

    if (!(label && haystack.includes(label) || code && haystack.includes(code))) {
      continue;
    }

    let score = 0;
    if (label && event.title.toLowerCase().includes(label)) score += 3;
    else if (label && haystack.includes(label)) score += 2;
    if (code && haystack.includes(code)) score += 2;
    if (hoursDiff >= 0 && hoursDiff <= 12) score += 3;
    else if (hoursDiff <= 24) score += 2;
    else score += 1;

    const isBillboard = event.title.includes("龙虎榜") || event.themeName.includes("龙虎榜");
    if (isBillboard) score += 2;
    if (event.infoType === "news_announcement") score += 1;
    if (directionKeywords.some((keyword) => haystack.includes(keyword))) score += 1;

    const level: SupportingClue["level"] =
      score >= 7 ? "high" : score >= 4 ? "medium" : "low";

    const prefix =
      isBillboard
        ? "龙虎榜线索"
        : event.infoType === "news_announcement"
          ? "公告线索"
          : "市场线索";

    candidates.push({
      level,
      title: `${prefix}：${event.themeName} · ${event.title}`,
      summary: `相关来源线索，发生时间 ${event.occurredAt.slice(0, 10)}。`,
      score,
      targetThemeId: event.themeId ?? null,
    });
  }

  return candidates.sort((left, right) => right.score - left.score).slice(0, 3);
}

function buildMoverCard(
  market: "a_share" | "hk",
  direction: MoverDirection,
  mover: ThemeMarketMover,
  announcements: AnnouncementCandidate[],
  supportingEvents: SupportingEvent[],
  moverOccurredAt: string,
): ReportMoverCard {
  const primaryAnnouncement = buildAnnouncementHintForMover(mover, announcements, moverOccurredAt, direction);
  const supportingClues = buildSupportingCluesForMover(mover, supportingEvents, moverOccurredAt, direction);

  return {
    market,
    direction,
    label: mover.label,
    code: mover.code,
    changeText: formatSignedPercent(mover.changePercent) ?? "--",
    reasons: mover.reasons?.slice(0, 3) ?? [],
    announcementClues: primaryAnnouncement
      ? [{ level: primaryAnnouncement.level, title: primaryAnnouncement.title, targetThemeId: primaryAnnouncement.targetThemeId ?? null }]
      : [],
    sourceClues: supportingClues.map(({ score: _score, ...item }) => item),
  };
}

function clueWeight(level: "high" | "medium" | "low") {
  return level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function dedupeRankedClues(clues: RankedClue[]) {
  const map = new Map<string, { title: string; summary: string; weight: number; targetThemeId?: string | null }>();

  for (const clue of clues) {
    const key = clue.title.trim().toLowerCase();
    const weight = clueWeight(clue.level);
    const existing = map.get(key);

    if (!existing || weight > existing.weight) {
      map.set(key, {
        title: clue.title,
        summary: clue.summary,
        weight,
        targetThemeId: clue.targetThemeId ?? null,
      });
    }
  }

  return [...map.values()].sort((left, right) => right.weight - left.weight);
}

function buildReportFromThemeDetail(
  detail: { marketOverview?: ThemeMarketOverview | null },
  announcements: AnnouncementCandidate[],
  supportingEvents: SupportingEvent[],
): StockMarketCloseReport | null {
  if (!detail.marketOverview) {
    return null;
  }

  const overview = detail.marketOverview;
  const aShare = overview.snapshots.find((snapshot) => snapshot.market === "a_share");
  const hk = overview.snapshots.find((snapshot) => snapshot.market === "hk");

  const keySignals = overview.snapshots.flatMap((snapshot) => snapshot.highlights.slice(0, 2)).slice(0, 6);

  const sectorFocus = (aShare?.sectorFlows ?? []).slice(0, 3).map((sector) => {
    const inflow = formatSignedAmount(sector.netInflowBillion, "CNY");
    const change = formatSignedPercent(sector.changePercent);
    return [
      sector.label,
      inflow ? `资金 ${inflow}` : null,
      change ? `涨跌 ${change}` : null,
      sector.leadingStockName ? `龙头 ${sector.leadingStockName}` : null,
    ].filter(Boolean).join(" · ");
  });

  const moverFocus = [
    ...(aShare?.topMovers ?? []).slice(0, 2).map((mover) => {
      const lead = mover.reasons?.[0] ?? "A股强势异动，值得继续跟踪。";
      const announcementHint = buildAnnouncementHintForMover(mover, announcements, aShare?.occurredAt ?? "", "up");
      return `${mover.label} ${formatSignedPercent(mover.changePercent) ?? ""} · ${announcementHint ? `公告${announcementHint.level === "high" ? "高相关" : announcementHint.level === "medium" ? "可能相关" : "背景线索"}：${announcementHint.title}` : lead}`.trim();
    }),
    ...(hk?.topMovers ?? []).slice(0, 1).map((mover) => {
      const lead = mover.reasons?.[0] ?? "港股异动龙头，可用于观察跨市场风险偏好。";
      const announcementHint = buildAnnouncementHintForMover(mover, announcements, hk?.occurredAt ?? "", "up");
      return `${mover.label} ${formatSignedPercent(mover.changePercent) ?? ""} · ${announcementHint ? `公告${announcementHint.level === "high" ? "高相关" : announcementHint.level === "medium" ? "可能相关" : "背景线索"}：${announcementHint.title}` : lead}`.trim();
    }),
    ...(aShare?.topDecliners ?? []).slice(0, 1).map((mover) => {
      const lead = mover.reasons?.[0] ?? "A股弱势个股，适合用于验证回撤压力。";
      const announcementHint = buildAnnouncementHintForMover(mover, announcements, aShare?.occurredAt ?? "", "down");
      return `${mover.label} ${formatSignedPercent(mover.changePercent) ?? ""} · ${announcementHint ? `公告${announcementHint.level === "high" ? "高相关" : announcementHint.level === "medium" ? "可能相关" : "背景线索"}：${announcementHint.title}` : lead}`.trim();
    }),
  ].slice(0, 4);

  const announcementFocus = [
    ...(aShare?.topMovers ?? []).map((mover) => buildAnnouncementHintForMover(mover, announcements, aShare?.occurredAt ?? "", "up")),
    ...(hk?.topMovers ?? []).map((mover) => buildAnnouncementHintForMover(mover, announcements, hk?.occurredAt ?? "", "up")),
    ...(aShare?.topDecliners ?? []).map((mover) => buildAnnouncementHintForMover(mover, announcements, aShare?.occurredAt ?? "", "down")),
  ]
    .filter((item): item is AnnouncementClue => Boolean(item))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ score: _score, ...item }) => item);

  const actionItems: string[] = [];
  const moverCards: ReportMoverCard[] = [
    ...(aShare?.topMovers ?? []).slice(0, 2).map((mover) => buildMoverCard("a_share", "up", mover, announcements, supportingEvents, aShare?.occurredAt ?? "")),
    ...(hk?.topMovers ?? []).slice(0, 1).map((mover) => buildMoverCard("hk", "up", mover, announcements, supportingEvents, hk?.occurredAt ?? "")),
    ...(aShare?.topDecliners ?? []).slice(0, 1).map((mover) => buildMoverCard("a_share", "down", mover, announcements, supportingEvents, aShare?.occurredAt ?? "")),
  ];
  const sourceClues = moverCards
    .flatMap((card) => card.sourceClues)
    .map((item) => ({ ...item, score: item.level === "high" ? 3 : item.level === "medium" ? 2 : 1 }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ score: _score, ...item }) => item);
  const catalystPool = dedupeRankedClues([
    ...announcementFocus,
    ...sourceClues,
    ...moverCards.flatMap((card) => [
      ...card.announcementClues.map((item) => ({
        level: item.level,
        title: item.title,
        summary: `${card.label} 的公告关联线索。`,
        targetThemeId: item.targetThemeId ?? null,
      })),
      ...card.sourceClues,
    ]),
  ]);
  const catalystSummary = {
    primary: catalystPool.filter((item) => item.weight >= 3).slice(0, 3).map(({ weight: _weight, ...item }) => item),
    secondary: catalystPool.filter((item) => item.weight === 2).slice(0, 4).map(({ weight: _weight, ...item }) => item),
    background: catalystPool.filter((item) => item.weight === 1).slice(0, 4).map(({ weight: _weight, ...item }) => item),
  };
  const timeline = [
    {
      at: `${toCstDate(new Date())}T16:00:00+08:00`,
      title: overview.headline,
      summary: overview.summary,
      kind: "market_close" as const,
      targetThemeId: STOCK_MARKET_THEME_ID,
    },
    ...catalystSummary.primary.map((item) => ({
      at: `${toCstDate(new Date())}T16:02:00+08:00`,
      title: item.title,
      summary: item.summary,
      kind: "primary_catalyst" as const,
      targetThemeId: item.targetThemeId ?? null,
    })),
    ...catalystSummary.secondary.slice(0, 2).map((item) => ({
      at: `${toCstDate(new Date())}T16:04:00+08:00`,
      title: item.title,
      summary: item.summary,
      kind: "secondary_catalyst" as const,
      targetThemeId: item.targetThemeId ?? null,
    })),
    ...moverCards.slice(0, 3).map((card) => ({
      at: `${toCstDate(new Date())}T16:06:00+08:00`,
      title: `${card.label} ${card.changeText}`,
      summary: [
        card.reasons[0] ?? null,
        card.announcementClues[0]?.title ? `公告线索：${card.announcementClues[0].title}` : null,
        card.sourceClues[0]?.title ?? null,
      ].filter(Boolean).join("；"),
      kind: "mover" as const,
      targetThemeId: STOCK_MARKET_THEME_ID,
    })),
  ];

  if (sectorFocus[0]) {
    actionItems.push(`优先复盘 ${sectorFocus[0].split(" · ")[0]}，判断吸金主线是否具备延续性。`);
  }

  if (aShare?.topMovers?.[0]) {
    const mover = aShare.topMovers[0];
    const announcementHint = buildAnnouncementHintForMover(mover, announcements, aShare?.occurredAt ?? "", "up");
    actionItems.push(
      announcementHint
        ? `跟踪 ${mover.label}，重点核对「${announcementHint.title}」是否是这次异动的${announcementHint.level === "high" ? "直接触发因素" : announcementHint.level === "medium" ? "可能触发因素" : "背景线索"}。`
        : mover.reasons?.[0]
          ? `跟踪 ${mover.label}，重点确认「${mover.reasons[0]}」是否会延续到下一交易日。`
        : `跟踪 ${mover.label}，确认A股强势异动是否只是情绪脉冲。`,
    );
  }

  if (hk?.topMovers?.[0]) {
    actionItems.push(`对照港股异动龙头 ${hk.topMovers[0].label}，判断南向资金是否还在同步支撑。`);
  }

  if (sourceClues[0]) {
    actionItems.push(`补看 ${sourceClues[0].title}，确认它是否能解释当天的主要异动。`);
  }

  if (!actionItems.length) {
    actionItems.push("当前盘后结构信号有限，下一交易日优先观察新的板块资金主线。");
  }

  return {
    date: toCstDate(new Date()),
    headline: overview.headline,
    summary: overview.summary,
    keySignals,
    timeline,
    catalystSummary,
    sectorFocus,
    moverFocus,
    announcementFocus,
    sourceClues,
    moverCards,
    actionItems,
  };
}

export async function getStockMarketCloseReport(): Promise<StockMarketCloseReport | null> {
  const detail = await getThemeDetail(STOCK_MARKET_THEME_ID);

  if (!detail) {
    return null;
  }

  const [announcements, supportingEvents] = await Promise.all([
    loadRecentAnnouncementCandidates(),
    loadRecentSupportingEvents(),
  ]);
  return buildReportFromThemeDetail(detail, announcements, supportingEvents);
}

export async function diagnoseStockMarketCloseReport() {
  const db = getDatabase();
  const mode = db ? "db" : "mock";

  try {
    const detail = await getThemeDetail(STOCK_MARKET_THEME_ID);

    if (!detail) {
      return {
        mode,
        stage: "theme_not_found",
        message: `Theme "${STOCK_MARKET_THEME_ID}" does not exist. Create an eastmoney-market-overview source first.`,
      };
    }

    const sourceCount = detail.sources?.length ?? 0;
    const recordCount = detail.records?.length ?? 0;
    const hasMarketOverview = Boolean(detail.marketOverview);

    if (!hasMarketOverview) {
      return {
        mode,
        stage: "market_overview_missing",
        message: `Theme exists (${sourceCount} sources, ${recordCount} records) but no records with event_class="market_overview" found. The eastmoney_market_overview adapter may not have run yet, or its normalizer output lacks the event_class field.`,
        sourceCount,
        recordCount,
      };
    }

    const report = await getStockMarketCloseReport();

    if (!report) {
      return {
        mode,
        stage: "report_build_failed",
        message: "Market overview data exists but report construction failed.",
        sourceCount,
        recordCount,
        hasMarketOverview,
      };
    }

    return {
      mode,
      stage: "ok",
      message: "Report is available.",
      sourceCount,
      recordCount,
      hasMarketOverview,
      reportDate: report.date,
    };
  } catch (error) {
    return {
      mode,
      stage: "error",
      message: `Diagnosis failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getStockMarketCloseReportHistory(limit: number = 7): Promise<StockMarketCloseReportSnapshot[]> {
  const db = requireDatabase();

  const rows = await db
    .selectFrom("workspace_close_reports")
    .select(["id", "workspace_id as workspaceId", "date", "report", "created_at"])
    .where("workspace_id", "=", STOCK_MARKET_WORKSPACE_ID)
    .orderBy("created_at", "desc")
    .limit(limit)
    .execute();

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    date: row.date,
    report: (typeof row.report === "string" ? JSON.parse(row.report) : row.report) as StockMarketCloseReport,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }));
}

export async function getStockMarketCloseReportSnapshotByDate(date: string): Promise<StockMarketCloseReportSnapshot | null> {
  const db = requireDatabase();

  const row = await db
    .selectFrom("workspace_close_reports")
    .select(["id", "workspace_id as workspaceId", "date", "report", "created_at"])
    .where("workspace_id", "=", STOCK_MARKET_WORKSPACE_ID)
    .where("date", "=", date)
    .limit(1)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    date: row.date,
    report: (typeof row.report === "string" ? JSON.parse(row.report) : row.report) as StockMarketCloseReport,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function hasStockMarketCloseReportForDate(date: string): Promise<boolean> {
  const db = requireDatabase();

  const row = await db
    .selectFrom("workspace_close_reports")
    .select("id")
    .where("workspace_id", "=", STOCK_MARKET_WORKSPACE_ID)
    .where("date", "=", date)
    .limit(1)
    .executeTakeFirst();

  return row !== undefined;
}

export async function saveStockMarketCloseReportSnapshot(report: StockMarketCloseReport): Promise<StockMarketCloseReportSnapshot> {
  const db = requireDatabase();
  const now = new Date().toISOString();

  const snapshot: StockMarketCloseReportSnapshot = {
    id: createId("report"),
    workspaceId: STOCK_MARKET_WORKSPACE_ID,
    date: report.date,
    report,
    createdAt: now,
  };

  const existing = await db
    .selectFrom("workspace_close_reports")
    .select(["id", "workspace_id as workspaceId", "date", "report", "created_at"])
    .where("workspace_id", "=", STOCK_MARKET_WORKSPACE_ID)
    .where("date", "=", report.date)
    .limit(1)
    .executeTakeFirst();

  if (existing) {
    return {
      id: existing.id,
      workspaceId: existing.workspaceId,
      date: existing.date,
      report: (typeof existing.report === "string" ? JSON.parse(existing.report) : existing.report) as StockMarketCloseReport,
      createdAt: existing.created_at instanceof Date ? existing.created_at.toISOString() : String(existing.created_at),
    };
  }

  await db
    .insertInto("workspace_close_reports")
    .values({
      id: snapshot.id,
      workspace_id: snapshot.workspaceId,
      date: snapshot.date,
      report: JSON.stringify(snapshot.report),
      created_at: snapshot.createdAt,
    })
    .execute();

  return snapshot;
}

export async function saveTodayStockMarketCloseReportIfNeeded() {
  const report = await getStockMarketCloseReport();
  if (!report) {
    return null;
  }

  const exists = await hasStockMarketCloseReportForDate(report.date);
  if (exists) {
    const history = await getStockMarketCloseReportHistory(1);
    return history[0] ?? null;
  }

  return saveStockMarketCloseReportSnapshot(report);
}
