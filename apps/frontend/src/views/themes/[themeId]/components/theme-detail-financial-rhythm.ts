import type { ThemeDetail, ThemeRecord } from "../../../../lib/api";
import { eventSignalLabel } from "../../../../lib/presentation";

export type FinancialRhythmRound = {
  roundIndex: number;
  occurredAt: string;
  direction: "liquidity_injection" | "liquidity_withdrawal" | "neutral";
  directionLabel: string;
  amount: number | null;
  amountLabel: string;
  termDays: number | null;
  termLabel: string;
  operationType: string | null;
  announcementNo: string | null;
};

export type FinancialRhythmData = {
  headline: string;
  summary: string;
  rounds: FinancialRhythmRound[];
  currentDirection: string;
  directionTrend: "strengthening" | "switching" | "neutral" | "insufficient";
  directionTrendLabel: string;
  directionTrendSummary: string;
  amountTrend: "increasing" | "decreasing" | "stable" | "insufficient";
  amountTrendLabel: string;
  stats: string[];
};

function normalizeDirection(value: unknown): "liquidity_injection" | "liquidity_withdrawal" | "neutral" {
  if (value === "liquidity_injection" || value === "bullish") {
    return "liquidity_injection";
  }

  if (value === "liquidity_withdrawal" || value === "bearish") {
    return "liquidity_withdrawal";
  }

  return "neutral";
}

function formatAmount(amount: unknown): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "金额暂无";
  }

  return `${amount.toLocaleString("zh-CN")} 亿元`;
}

function formatTermDays(days: unknown): string {
  if (typeof days !== "number" || !Number.isFinite(days)) {
    return "";
  }

  if (days === 7) return "7天";
  if (days === 14) return "14天";
  if (days === 28) return "28天";
  return `${days}天`;
}

function formatOperationType(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim() || "";
}

export function buildFinancialRhythmData(detail: ThemeDetail): FinancialRhythmData | null {
  if (detail.theme.type !== "financial_event") {
    return null;
  }

  const records = [...detail.records]
    .filter((record) => record.infoType === "financial_event")
    .sort((left, right) => {
      const leftTime = new Date(left.occurredAt).getTime();
      const rightTime = new Date(right.occurredAt).getTime();
      return rightTime - leftTime;
    });

  if (records.length === 0) {
    return null;
  }

  // Build rounds from recent records (max 5)
  const recentRecords = records.slice(0, 5);
  const rounds: FinancialRhythmRound[] = recentRecords.map((record, index) => {
    const direction = normalizeDirection(record.content.direction_label);
    const amount = Number(record.content.amount_billion_cny ?? NaN);
    const termDays = Number(record.content.term_days ?? NaN);

    return {
      roundIndex: index + 1,
      occurredAt: record.occurredAt,
      direction,
      directionLabel: eventSignalLabel(direction),
      amount: Number.isFinite(amount) ? amount : null,
      amountLabel: formatAmount(amount),
      termDays: Number.isFinite(termDays) ? termDays : null,
      termLabel: formatTermDays(termDays),
      operationType: formatOperationType(record.content.operation_type),
      announcementNo: typeof record.content.announcement_no === "string" ? record.content.announcement_no : null,
    };
  });

  // Analyze direction trend
  const directions = rounds.map((r) => r.direction);
  const currentDirection = directions[0] ?? "neutral";
  const currentDirectionLabel = eventSignalLabel(currentDirection);

  let directionTrend: FinancialRhythmData["directionTrend"] = "insufficient";
  let directionTrendLabel = "样本不足";
  let directionTrendSummary = "当前只有单轮记录，无法判断方向趋势。";

  if (directions.length >= 2) {
    const latest = directions[0];
    const previous = directions[1];

    if (latest === previous && latest !== "neutral") {
      directionTrend = "strengthening";
      directionTrendLabel = "方向强化";
      directionTrendSummary = `最近连续两轮都是${eventSignalLabel(latest)}，方向正在被重复确认。`;
    } else if (latest !== previous && latest !== "neutral" && previous !== "neutral") {
      directionTrend = "switching";
      directionTrendLabel = "方向切换";
      directionTrendSummary = `最新方向为${eventSignalLabel(latest)}，上一轮为${eventSignalLabel(previous)}，正在发生切换。`;
    } else {
      directionTrend = "neutral";
      directionTrendLabel = "偏中性";
      directionTrendSummary = "最近方向信号不够明确，适合继续观察。";
    }
  }

  // Analyze amount trend
  const amounts = rounds
    .map((r) => r.amount)
    .filter((a): a is number => a != null);

  let amountTrend: FinancialRhythmData["amountTrend"] = "insufficient";
  let amountTrendLabel = "金额样本不足";

  if (amounts.length >= 2) {
    const latest = amounts[0];
    const previous = amounts[1];
    const delta = latest - previous;
    const deltaPercent = previous !== 0 ? (delta / previous) * 100 : 0;

    if (Math.abs(deltaPercent) < 5) {
      amountTrend = "stable";
      amountTrendLabel = `金额基本持平，仍在 ${latest.toLocaleString("zh-CN")} 亿元左右`;
    } else if (delta > 0) {
      amountTrend = "increasing";
      amountTrendLabel = `金额较上一轮增加 ${delta.toLocaleString("zh-CN")} 亿元 (+${deltaPercent.toFixed(0)}%)`;
    } else {
      amountTrend = "decreasing";
      amountTrendLabel = `金额较上一轮减少 ${Math.abs(delta).toLocaleString("zh-CN")} 亿元 (${deltaPercent.toFixed(0)}%)`;
    }
  }

  // Build stats
  const injectionCount = directions.filter((d) => d === "liquidity_injection").length;
  const withdrawalCount = directions.filter((d) => d === "liquidity_withdrawal").length;
  const neutralCount = directions.filter((d) => d === "neutral").length;

  const stats = [
    `最近 ${rounds.length} 轮操作`,
    `偏宽松 ${injectionCount} 轮 / 偏收紧 ${withdrawalCount} 轮 / 中性 ${neutralCount} 轮`,
    directionTrendLabel,
    amountTrendLabel,
  ];

  const headline = directionTrend === "strengthening"
    ? `流动性方向连续偏${currentDirection === "liquidity_injection" ? "宽松" : "收紧"}`
    : directionTrend === "switching"
      ? "流动性方向正在切换"
      : "流动性方向暂时偏中性";

  const summary = directionTrend === "strengthening"
    ? `最近几轮操作都在重复确认${currentDirectionLabel}方向，适合结合金额和期限判断是否需要调整市场预期。`
    : directionTrend === "switching"
      ? "最新一轮和上一轮方向不一致，当前更适合继续观察，避免过早判断趋势。"
      : "当前还没有足够强的连续方向信号，先作为背景信息继续累计。";

  return {
    headline,
    summary,
    rounds,
    currentDirection: currentDirectionLabel,
    directionTrend,
    directionTrendLabel,
    directionTrendSummary,
    amountTrend,
    amountTrendLabel,
    stats,
  };
}
