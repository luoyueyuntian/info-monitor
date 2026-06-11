import type { ThemeDetail, ThemeRecord } from "../../../../lib/api";
import { eventSignalLabel, formatMaybeLabel } from "../../../../lib/presentation";

export type ThemeSourceCompareItem = {
  sourceId: string;
  sourceName: string;
  sourceStatus: string;
  latestRecordAt: string | null;
  title: string;
  primaryValue: string;
  secondaryValue: string | null;
  tertiaryValue: string | null;
  summary: string | null;
  recordLink: string | null;
  badge: string | null;
  deltaLabel: string | null;
  trendLabel: string | null;
  trendDeltaLabel: string | null;
  trendPoints: Array<{
    label: string;
    value: number;
    x: number;
    y: number;
  }>;
  hasRecord: boolean;
};

export type ThemeSourceCompareData = {
  headline: string;
  summary: string;
  stats: string[];
  diagnostic?: {
    tone: "healthy" | "pending" | "warning";
    toneLabel: string;
    headline: string;
    summary: string;
    keyPoints: string[];
    actions: string[];
    timing?: {
      headline: string;
      summary: string;
      signals: string[];
    } | null;
  } | null;
  items: ThemeSourceCompareItem[];
};

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatShortText(value: unknown, fallback = "暂无") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.length > 40 ? `${normalized.slice(0, 40)}...` : normalized;
}

function formatCurrency(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
}

function contentUpdateLabel(value: unknown) {
  switch (value) {
    case "feature_release":
      return "功能发布";
    case "version_release":
      return "版本发布";
    case "bug_fix":
      return "修复更新";
    case "marketing_campaign":
      return "营销活动";
    case "policy_update":
      return "政策更新";
    default:
      return typeof value === "string" && value.trim() ? value : "内容更新";
  }
}

function announcementCategoryLabel(value: unknown) {
  switch (value) {
    case "macro_release":
      return "宏观发布";
    case "news_announcement":
      return "官方发布";
    default:
      return typeof value === "string" && value.trim() ? value : "公告";
  }
}

function sourceRecordLink(record: ThemeRecord | undefined) {
  const url = record?.content.url;
  return typeof url === "string" ? url : null;
}

function buildMissingRecordItem(
  source: ThemeDetail["sources"][number],
): ThemeSourceCompareItem {
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceStatus: source.status,
    latestRecordAt: source.latestSuccessAt ?? source.latestRunAt ?? null,
    title: "暂无标准化记录",
    primaryValue: "这个来源还没有产出可对比结果",
    secondaryValue: source.isPaused ? "来源当前已暂停" : "等待下一轮抓取或标准化完成",
    tertiaryValue: null,
    summary: null,
    recordLink: null,
    badge: source.status === "warning" ? "需复核" : null,
    deltaLabel: null,
    trendLabel: null,
    trendDeltaLabel: null,
    trendPoints: [],
    hasRecord: false,
  };
}

function buildNonPriceValues(record: ThemeRecord) {
  if (record.infoType === "financial_event") {
    const direction = eventSignalLabel(String(record.content.direction_label ?? "neutral"));
    const amount = record.content.amount_billion_cny;
    const operation = formatMaybeLabel(record.content.operation_type);

    return {
      primaryValue: direction,
      secondaryValue:
        typeof amount === "number" ? `${amount.toLocaleString("zh-CN")} 亿元 · ${operation}` : operation,
      tertiaryValue: formatMaybeLabel(record.content.announcement_no),
      summary: formatShortText(record.content.direction_reason, formatShortText(record.title)),
    };
  }

  if (record.infoType === "content_update") {
    return {
      primaryValue: contentUpdateLabel(record.content.update_type),
      secondaryValue: formatMaybeLabel(record.content.object_name),
      tertiaryValue: formatShortText(record.content.summary),
      summary: formatShortText(record.title),
    };
  }

  if (record.infoType === "news_announcement") {
    const topic = typeof record.content.release_topic_label === "string" ? record.content.release_topic_label : null;
    const publisher = typeof record.content.publisher === "string" ? record.content.publisher : null;

    return {
      primaryValue: topic || announcementCategoryLabel(record.content.category),
      secondaryValue: publisher || announcementCategoryLabel(record.content.category),
      tertiaryValue: formatShortText(record.content.description),
      summary: formatShortText(record.title),
    };
  }

  return {
    primaryValue: formatShortText(record.title),
    secondaryValue: null,
    tertiaryValue: null,
    summary: null,
  };
}

function buildPriceHistoryBySource(records: ThemeRecord[]) {
  const history = new Map<string, ThemeRecord[]>();

  for (const record of records) {
    if (record.sourceId && record.infoType === "price") {
      const list = history.get(record.sourceId) ?? [];
      list.push(record);
      history.set(record.sourceId, list);
    }
  }

  return history;
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/\//g, "-");
}

function buildPriceTrendVisual(records: ThemeRecord[]) {
  const sourceRecords = [...records]
    .filter((record) => record.infoType === "price")
    .sort((left, right) => toTimestamp(left.occurredAt) - toTimestamp(right.occurredAt))
    .slice(-4);

  if (sourceRecords.length < 2) {
    return {
      trendLabel: null,
      trendDeltaLabel: null,
      trendPoints: [] as ThemeSourceCompareItem["trendPoints"],
    };
  }

  const values = sourceRecords
    .map((record) => Number(record.content.price ?? NaN))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return {
      trendLabel: null,
      trendDeltaLabel: null,
      trendPoints: [] as ThemeSourceCompareItem["trendPoints"],
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const first = values[0];
  const last = values[values.length - 1];
  const deltaRatio = first !== 0 ? ((last - first) / first) * 100 : 0;

  let trendLabel = "基本持平";
  if (deltaRatio <= -1.5) {
    trendLabel = "持续下探";
  } else if (deltaRatio >= 1.5) {
    trendLabel = "短线回升";
  }

  return {
    trendLabel,
    trendDeltaLabel: `${deltaRatio >= 0 ? "+" : ""}${deltaRatio.toFixed(1)}%`,
    trendPoints: sourceRecords.map((record, index) => ({
      label: formatShortDate(record.occurredAt),
      value: Number(record.content.price),
      x: 12 + (index * 132) / Math.max(sourceRecords.length - 1, 1),
      y: 56 - ((Number(record.content.price) - min) / range) * 36,
    })),
  };
}

function buildPriceTimingDiagnostic(input: {
  historyBySource: Map<string, ThemeRecord[]>;
  latestPriceBySource: Map<string, number>;
  lowestItem?: ThemeSourceCompareItem;
  currency: string;
}) {
  const currentLowestSourceId = input.lowestItem?.sourceId ?? null;
  const historyEntries = [...input.historyBySource.entries()];
  const comparablePreviousEntries = historyEntries.filter(([, records]) => records.length > 1);

  if (!currentLowestSourceId || comparablePreviousEntries.length < 2) {
    return {
      headline: "连续快照样本仍偏少",
      summary: "当前已经能看到静态快照，但还不足以稳定判断最低来源是否持续占优，或价差是否正在变化。",
      signals: [
        input.lowestItem ? `当前最低来源是 ${input.lowestItem.sourceName}。` : "当前最低来源仍未形成。",
        `当前只有 ${comparablePreviousEntries.length} 个来源具备至少两轮价格样本。`,
      ],
    };
  }

  const previousPriceBySource = new Map<string, number>();

  for (const [sourceId, sourceRecords] of comparablePreviousEntries) {
    const previousPrice = Number(sourceRecords[1]?.content.price ?? NaN);

    if (Number.isFinite(previousPrice)) {
      previousPriceBySource.set(sourceId, previousPrice);
    }
  }

  if (previousPriceBySource.size < 2) {
    return {
      headline: "连续快照样本仍偏少",
      summary: "虽然部分来源已经有前一轮价格记录，但还不够形成可比较的上一轮价差。",
      signals: [
        input.lowestItem ? `当前最低来源是 ${input.lowestItem.sourceName}。` : "当前最低来源仍未形成。",
        "继续累计更多来源的第二轮样本后，再判断最低来源稳定性会更可靠。",
      ],
    };
  }

  const previousPrices = [...previousPriceBySource.values()];
  const previousMinPrice = Math.min(...previousPrices);
  const previousMaxPrice = Math.max(...previousPrices);
  const currentComparablePrices = [...previousPriceBySource.keys()]
    .map((sourceId) => input.latestPriceBySource.get(sourceId))
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price));
  const currentComparableMin = Math.min(...currentComparablePrices);
  const currentComparableMax = Math.max(...currentComparablePrices);
  const previousSpread = previousMaxPrice - previousMinPrice;
  const currentSpread = currentComparableMax - currentComparableMin;
  const spreadDelta = currentSpread - previousSpread;
  const previousLowestSourceId = [...previousPriceBySource.entries()].sort((left, right) => left[1] - right[1])[0]?.[0] ?? null;
  const currentLowestLatestPrice = input.latestPriceBySource.get(currentLowestSourceId) ?? null;
  const currentLowestPreviousPrice = previousPriceBySource.get(currentLowestSourceId) ?? null;

  const lowestStabilitySignal =
    previousLowestSourceId === currentLowestSourceId
      ? currentLowestLatestPrice != null && currentLowestPreviousPrice != null
        ? currentLowestLatestPrice < currentLowestPreviousPrice
          ? `最低来源仍是 ${input.lowestItem?.sourceName ?? "当前最低来源"}，且价格较上一轮继续下探。`
          : currentLowestLatestPrice > currentLowestPreviousPrice
            ? `最低来源仍是 ${input.lowestItem?.sourceName ?? "当前最低来源"}，但价格较上一轮已有回升。`
            : `最低来源仍是 ${input.lowestItem?.sourceName ?? "当前最低来源"}，且价格与上一轮持平。`
        : `最低来源仍是 ${input.lowestItem?.sourceName ?? "当前最低来源"}。`
      : previousLowestSourceId
        ? `最低来源从 ${previousLowestSourceId} 切换到了 ${input.lowestItem?.sourceName ?? "当前最低来源"}。`
        : `当前最低来源是 ${input.lowestItem?.sourceName ?? "当前最低来源"}。`;

  const spreadTrendSignal =
    Math.abs(spreadDelta) < 1
      ? `当前价差与上一轮基本持平，仍在 ${currentSpread.toLocaleString("zh-CN")} ${input.currency} 左右。`
      : spreadDelta > 0
        ? `当前价差较上一轮扩大了 ${spreadDelta.toLocaleString("zh-CN")} ${input.currency}。`
        : `当前价差较上一轮收敛了 ${Math.abs(spreadDelta).toLocaleString("zh-CN")} ${input.currency}。`;

  return {
    headline: previousLowestSourceId === currentLowestSourceId ? "最低来源暂时比较稳定" : "最低来源正在发生切换",
    summary:
      Math.abs(spreadDelta) < 1
        ? "连续两轮快照看下来，最低来源格局暂时没有剧烈变化，当前更适合继续等待下一轮确认。"
        : spreadDelta > 0
          ? "连续两轮快照看下来，来源间的价格差距正在扩大，当前最低来源更值得优先复核。"
          : "连续两轮快照看下来，来源间的价格差距正在收敛，当前更适合继续观察最低价是否能持续。 ",
    signals: [
      lowestStabilitySignal,
      spreadTrendSignal,
      `上一轮价差约为 ${previousSpread.toLocaleString("zh-CN")} ${input.currency}，当前价差约为 ${currentSpread.toLocaleString("zh-CN")} ${input.currency}。`,
    ],
  };
}

function normalizeFinancialDirection(value: unknown) {
  if (value === "liquidity_injection" || value === "bullish") {
    return "liquidity_injection";
  }

  if (value === "liquidity_withdrawal" || value === "bearish") {
    return "liquidity_withdrawal";
  }

  return "neutral";
}

function buildFinancialEventDiagnostic(input: {
  records: ThemeRecord[];
  sources: ThemeDetail["sources"];
  coveredCount: number;
}) {
  const records = input.records
    .filter((record) => record.infoType === "financial_event")
    .sort((left, right) => toTimestamp(right.occurredAt) - toTimestamp(left.occurredAt));
  const warningCount = input.sources.filter((source) => source.status === "warning").length;

  if (!records.length) {
    return {
      tone: "pending" as const,
      toneLabel: "样本不足",
      headline: "当前还没有足够的金融事件快照",
      summary: "先保证来源持续产出结构化记录，再判断最近流动性方向是在强化、反转还是维持中性。",
      keyPoints: [
        `当前已覆盖 ${input.coveredCount}/${input.sources.length} 个来源。`,
        warningCount > 0 ? `当前有 ${warningCount} 个来源处于异常状态。` : "当前来源状态整体稳定。",
      ],
      actions: [
        "优先补跑最近没有产出结构化结果的来源。",
        "等到连续几轮金融事件入库后，再判断方向是否正在强化。",
      ],
      timing: null,
    };
  }

  const latestRecords = records.slice(0, 4);
  const latestDirections = latestRecords.map((record) => normalizeFinancialDirection(record.content.direction_label));
  const injectionCount = latestDirections.filter((direction) => direction === "liquidity_injection").length;
  const withdrawalCount = latestDirections.filter((direction) => direction === "liquidity_withdrawal").length;
  const neutralCount = latestDirections.length - injectionCount - withdrawalCount;
  const latestDirection = latestDirections[0] ?? "neutral";
  const directionSummary = `最近 ${latestDirections.length} 条结构化记录里，偏宽松 ${injectionCount} 条、偏收紧 ${withdrawalCount} 条、中性 ${neutralCount} 条。`;
  const latestAmount = Number(latestRecords[0]?.content.amount_billion_cny ?? NaN);
  const previousAmount = Number(latestRecords[1]?.content.amount_billion_cny ?? NaN);
  const hasAmountTrend = Number.isFinite(latestAmount) && Number.isFinite(previousAmount);
  const amountDelta = hasAmountTrend ? latestAmount - previousAmount : null;
  const safeAmountDelta = amountDelta ?? 0;
  const timing =
    latestDirections.length < 2
      ? {
          headline: "连续样本仍偏少",
          summary: "当前还只有一轮可用结构化快照，先继续累计下一轮再判断方向是否正在强化。",
          signals: [
            `最新方向为${eventSignalLabel(latestDirection)}。`,
            directionSummary,
          ],
        }
      : latestDirections[0] === latestDirections[1] && latestDirections[0] !== "neutral"
        ? {
            headline: "方向正在连续强化",
            summary:
              latestDirection === "liquidity_injection"
                ? "最近连续两轮都偏向流动性投放，说明宽松方向正在被重复确认。"
                : "最近连续两轮都偏向流动性回笼，说明收紧方向正在被重复确认。",
            signals: [
              `最近连续两轮方向都为${eventSignalLabel(latestDirection)}。`,
              hasAmountTrend
                ? amountDelta === 0
                  ? `最近两轮金额基本持平，仍在 ${latestAmount.toLocaleString("zh-CN")} 亿元左右。`
                  : safeAmountDelta > 0
                    ? `最新金额较上一轮增加了 ${safeAmountDelta.toLocaleString("zh-CN")} 亿元。`
                    : `最新金额较上一轮减少了 ${Math.abs(safeAmountDelta).toLocaleString("zh-CN")} 亿元。`
                : "最近两轮金额样本不足，先以方向连续性为主。",
              directionSummary,
            ],
          }
        : latestDirections[0] !== latestDirections[1]
          ? {
              headline: "方向正在发生切换",
              summary: "最新一轮和上一轮的方向并不一致，当前更适合继续观察，避免过早把一次切换当作稳定趋势。",
              signals: [
                `最新方向为${eventSignalLabel(latestDirections[0])}，上一轮为${eventSignalLabel(latestDirections[1])}。`,
                hasAmountTrend
                  ? `最近两轮金额变化约 ${amountDelta! >= 0 ? "+" : "-"}${Math.abs(amountDelta!).toLocaleString("zh-CN")} 亿元。`
                  : "最近两轮金额样本不足，先以方向切换为主。",
                directionSummary,
              ],
            }
          : {
              headline: "方向暂时偏中性",
              summary: "最近两轮里至少有一轮仍是中性记录，当前更适合继续等后续公告，而不是过早判断方向已经明确。",
              signals: [
                `最近两轮方向依次为 ${latestDirections.slice(0, 2).map((item) => eventSignalLabel(item)).join(" / ")}。`,
                directionSummary,
              ],
            };

  if (warningCount > 0) {
    return {
      tone: "warning" as const,
      toneLabel: "需先复核",
      headline: "当前金融事件方向可看，但要先排除异常来源干扰",
      summary: "已有结构化金融事件结果，但来源异常会直接影响你对方向连续性和节奏变化的判断。",
      keyPoints: [
        `最新方向为${eventSignalLabel(latestDirection)}。`,
        directionSummary,
        `当前有 ${warningCount} 个来源处于异常状态。`,
      ],
      actions: [
        "先补跑异常来源，确认最近方向变化不是因为漏抓造成的。",
        "复核最新一轮公告正文，再判断这次方向变化是否需要提高关注级别。",
      ],
      timing,
    };
  }

  if (latestDirections.length >= 2 && latestDirections[0] === latestDirections[1] && latestDirections[0] !== "neutral") {
    return {
      tone: "healthy" as const,
      toneLabel: "方向强化",
      headline:
        latestDirection === "liquidity_injection"
          ? "最近几轮流动性方向连续偏宽松"
          : "最近几轮流动性方向连续偏收紧",
      summary: "最近连续几轮结构化记录在重复确认同一方向，这时更适合结合金额、期限和市场反应继续复核。",
      keyPoints: [
        `最新方向为${eventSignalLabel(latestDirection)}。`,
        directionSummary,
        hasAmountTrend
          ? `最新金额为 ${latestAmount.toLocaleString("zh-CN")} 亿元，上一轮为 ${previousAmount.toLocaleString("zh-CN")} 亿元。`
          : "最近金额样本不足，先以方向连续性为主。",
      ],
      actions: [
        "优先确认连续同向是否已经足以改变你的短期市场判断。",
        "再结合时间线查看这轮方向强化是突然出现，还是已经连续积累了几轮。",
      ],
      timing,
    };
  }

  if (latestDirections.length >= 2 && latestDirections[0] !== latestDirections[1]) {
    return {
      tone: "pending" as const,
      toneLabel: "方向反复",
      headline: "最近几轮金融事件方向正在反复切换",
      summary: "当前更适合把这些记录当作需要继续观察的输入，而不是立刻形成稳定结论。",
      keyPoints: [
        `最新方向为${eventSignalLabel(latestDirections[0])}，上一轮为${eventSignalLabel(latestDirections[1])}。`,
        directionSummary,
        input.coveredCount < input.sources.length ? `仍有 ${input.sources.length - input.coveredCount} 个来源缺少最近记录。` : "当前来源覆盖基本完整。",
      ],
      actions: [
        "优先等待下一轮结构化记录，确认这次方向切换是否会延续。",
        "如需提高把握，结合原始公告正文与市场实际反应交叉验证。",
      ],
      timing,
    };
  }

  return {
    tone: "healthy" as const,
    toneLabel: "中性观察",
    headline: "最近金融事件暂时偏中性，适合继续等待后续快照",
    summary: "当前还没有足够强的连续方向信号，先把它作为历史背景继续累计会更稳妥。",
    keyPoints: [
      `最新方向为${eventSignalLabel(latestDirection)}。`,
      directionSummary,
      input.coveredCount < input.sources.length ? `仍有 ${input.sources.length - input.coveredCount} 个来源缺少最近记录。` : "当前来源覆盖基本完整。",
    ],
    actions: [
      "继续等下一轮结构化结果，观察方向是否从中性转向更明确的一边。",
      "如出现连续同向记录，再提高回看优先级。",
    ],
    timing,
  };
}

export function buildThemeSourceCompareData(detail: ThemeDetail): ThemeSourceCompareData {
  const records = [...detail.records].sort((left, right) => toTimestamp(right.occurredAt) - toTimestamp(left.occurredAt));
  const latestRecordBySource = new Map<string, ThemeRecord>();

  for (const record of records) {
    if (record.sourceId && !latestRecordBySource.has(record.sourceId)) {
      latestRecordBySource.set(record.sourceId, record);
    }
  }

  if (detail.theme.type === "price") {
    const historyBySource = buildPriceHistoryBySource(records);
    const priceBySource = new Map<string, number>();

    for (const [sourceId, record] of latestRecordBySource.entries()) {
      const price = Number(record.content.price ?? NaN);

      if (Number.isFinite(price)) {
        priceBySource.set(sourceId, price);
      }
    }

    const prices = [...priceBySource.values()];
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;
    const referenceCurrency =
      formatCurrency(records.find((record) => typeof record.content.currency === "string")?.content.currency) ?? "CNY";

    const items = detail.sources
      .map((source) => {
        const record = latestRecordBySource.get(source.id);

        if (!record) {
          return buildMissingRecordItem(source);
        }

        const price = Number(record.content.price ?? NaN);
        const currency = formatCurrency(record.content.currency) ?? referenceCurrency;
        const spec = typeof record.content.spec === "string" ? record.content.spec : null;
        const symbol = typeof record.content.symbol === "string" ? record.content.symbol : null;
        const trend = buildPriceTrendVisual(historyBySource.get(source.id) ?? [record]);
        const isLowest = minPrice != null && Number.isFinite(price) && price === minPrice;
        const isHighest = maxPrice != null && minPrice != null && Number.isFinite(price) && price === maxPrice && maxPrice > minPrice;
        const deltaLabel =
          minPrice != null && Number.isFinite(price) && price > minPrice && minPrice > 0
            ? `较最低 +${(((price - minPrice) / minPrice) * 100).toFixed(1)}%`
            : null;

        return {
          sourceId: source.id,
          sourceName: source.name,
          sourceStatus: source.status,
          latestRecordAt: record.occurredAt,
          title: record.title,
          primaryValue: Number.isFinite(price) ? `${price.toLocaleString("zh-CN")} ${currency}` : "价格暂无",
          secondaryValue: spec,
          tertiaryValue: symbol,
          summary: formatShortText(record.title),
          recordLink: sourceRecordLink(record),
          badge: isLowest ? "当前最低" : isHighest ? "当前较高" : null,
          deltaLabel,
          trendLabel: trend.trendLabel,
          trendDeltaLabel: trend.trendDeltaLabel,
          trendPoints: trend.trendPoints,
          hasRecord: true,
        } satisfies ThemeSourceCompareItem;
      })
      .sort((left, right) => {
        const leftPrice = priceBySource.get(left.sourceId) ?? Number.POSITIVE_INFINITY;
        const rightPrice = priceBySource.get(right.sourceId) ?? Number.POSITIVE_INFINITY;

        if (leftPrice !== rightPrice) {
          return leftPrice - rightPrice;
        }

        return toTimestamp(right.latestRecordAt) - toTimestamp(left.latestRecordAt);
      });

    const coveredCount = items.filter((item) => item.hasRecord).length;
    const missingCount = detail.sources.length - coveredCount;
    const warningCount = detail.sources.filter((source) => source.status === "warning").length;
    const spreadAmount = minPrice != null && maxPrice != null ? maxPrice - minPrice : null;
    const spreadRatio =
      minPrice != null && maxPrice != null && minPrice > 0
        ? ((maxPrice - minPrice) / minPrice) * 100
        : null;
    const lowestItem = items.find((item) => item.badge === "当前最低");
    const latestSignal = detail.events[0]?.signal ?? null;
    const timing = buildPriceTimingDiagnostic({
      historyBySource,
      latestPriceBySource: priceBySource,
      lowestItem,
      currency: referenceCurrency,
    });
    const diagnostic =
      coveredCount === 0
        ? {
            tone: "pending" as const,
            toneLabel: "样本不足",
            headline: "当前还不足以形成跨来源比价判断",
            summary: "这批来源里还没有足够的标准化价格结果，先保证来源能稳定产出，再继续判断最低价是否成立。",
            keyPoints: [
              `当前已覆盖 ${coveredCount}/${detail.sources.length} 个来源。`,
              missingCount > 0 ? `仍有 ${missingCount} 个来源缺少最近价格记录。` : "当前所有来源都已产出记录。",
            ],
            actions: [
              "优先补跑还没有产出记录的来源。",
              "等到至少两个来源出现同配置价格后，再判断当前最低来源是否有意义。",
            ],
            timing,
          }
        : warningCount > 0
          ? {
              tone: "warning" as const,
              toneLabel: "需先复核",
              headline: "当前快照可看，但要先排除异常来源干扰",
              summary: "已有跨来源价格样本，但存在异常来源时，最低价和价差判断都可能被不完整数据放大或扭曲。",
              keyPoints: [
                lowestItem ? `当前最低来源是 ${lowestItem.sourceName}。` : "当前最低来源还未形成。",
                spreadRatio != null ? `最高较最低约高 ${spreadRatio.toFixed(1)}%。` : "当前价差比例还不足以估算。",
                `当前有 ${warningCount} 个来源处于异常状态。`,
              ],
              actions: [
                "先补跑异常来源，确认最低价不是因为其他来源漏抓造成的。",
                "复核最低来源是否为同配置、可成交且不是异常挂价。",
              ],
              timing,
            }
          : missingCount > 0
            ? {
                tone: "pending" as const,
                toneLabel: "覆盖不全",
                headline: "当前已经能看到最低价，但来源覆盖还不完整",
                summary: "这轮快照已经能帮助你确认最低来源和当前价差，但仍有部分来源缺记录，暂时更适合把它当作巡检信号，而不是完整结论。",
                keyPoints: [
                  lowestItem ? `当前最低来源是 ${lowestItem.sourceName}。` : "当前最低来源还未形成。",
                  spreadAmount != null ? `当前价差约为 ${spreadAmount.toLocaleString("zh-CN")} ${referenceCurrency}。` : "当前价差还不足以估算。",
                  `仍有 ${missingCount} 个来源缺少最近价格记录。`,
                ],
                actions: [
                  "优先补齐缺记录来源，再判断当前最低价是否稳定存在。",
                  latestSignal === "30d_low"
                    ? "即使已经触发 30 天新低，也建议等更多来源补齐后再决定是否跟进。"
                    : "当前更适合继续等下一轮抓取，而不是只看一轮快照做判断。",
                ],
                timing,
              }
            : spreadRatio != null && spreadRatio >= 5
              ? {
                  tone: "healthy" as const,
                  toneLabel: "价差明显",
                  headline: "当前跨来源价差已经拉开，值得优先复核最低来源",
                  summary: "多个来源都已有最近价格记录，且当前最高价与最低价之间存在比较明显的差距，说明这条快照已经具备较强的巡检价值。",
                  keyPoints: [
                    lowestItem ? `当前最低来源是 ${lowestItem.sourceName}。` : "当前最低来源还未形成。",
                    spreadAmount != null ? `当前价差约为 ${spreadAmount.toLocaleString("zh-CN")} ${referenceCurrency}。` : "当前价差还不足以估算。",
                    latestSignal === "30d_low" ? "最近同时出现了 30 天新低信号。" : "当前还没有额外的新低类信号。",
                  ],
                  actions: [
                    "优先复核最低来源是否为同配置、可成交且非异常挂价。",
                    "再结合时间线确认这次低价是一次性波动，还是连续下探的一部分。",
                  ],
                  timing,
                }
              : {
                  tone: "healthy" as const,
                  toneLabel: "价差平缓",
                  headline: "当前跨来源价差不大，更适合继续观察而不是立即下结论",
                  summary: "虽然多个来源都已经有最近价格记录，但目前的价差仍偏小，这更像一轮普通价格波动，而不是特别强的低价机会。",
                  keyPoints: [
                    lowestItem ? `当前最低来源是 ${lowestItem.sourceName}。` : "当前最低来源还未形成。",
                    spreadRatio != null ? `最高较最低约高 ${spreadRatio.toFixed(1)}%。` : "当前价差比例还不足以估算。",
                    "当前来源覆盖基本完整，可以继续把后续快照串起来观察。",
                  ],
                  actions: [
                    "先继续累计后续几轮快照，确认最低价是否持续存在。",
                    latestSignal === "30d_low"
                      ? "如果后续几轮仍保持低位，再提高跟进优先级。"
                      : "当前不必仅凭小幅价差做决定，可以回到趋势和时间线继续观察。",
                  ],
                  timing,
                };

    return {
      headline: "跨来源价格快照",
      summary:
        coveredCount > 0
          ? `已按来源展示最近一条同配置价格记录，适合快速确认当前最低价来自哪里，以及不同渠道之间的价差。`
          : "当前还没有可用于跨来源比较的价格记录。",
      diagnostic,
      stats: [
        `已覆盖 ${coveredCount}/${detail.sources.length} 个来源`,
        spreadAmount != null ? `当前价差 ${spreadAmount.toLocaleString("zh-CN")} ${referenceCurrency}` : "当前价差暂无",
        spreadRatio != null ? `最高较最低 +${spreadRatio.toFixed(1)}%` : "价差比例暂无",
        lowestItem ? `最低来源：${lowestItem.sourceName}` : "最低来源待生成",
      ],
      items,
    };
  }

  const latestAt = records[0]?.occurredAt ?? null;
  const coveredCount = detail.sources.filter((source) => latestRecordBySource.has(source.id)).length;
  const latestSourceId = records[0]?.sourceId ?? null;

  const items = detail.sources
    .map((source) => {
      const record = latestRecordBySource.get(source.id);

      if (!record) {
        return buildMissingRecordItem(source);
      }

      const values = buildNonPriceValues(record);

      return {
        sourceId: source.id,
        sourceName: source.name,
        sourceStatus: source.status,
        latestRecordAt: record.occurredAt,
        title: record.title,
        primaryValue: values.primaryValue,
        secondaryValue: values.secondaryValue,
        tertiaryValue: values.tertiaryValue,
        summary: values.summary,
        recordLink: sourceRecordLink(record),
        badge: record.sourceId === latestSourceId ? "最新更新" : null,
        deltaLabel: null,
        trendLabel: null,
        trendDeltaLabel: null,
        trendPoints: [],
        hasRecord: true,
      } satisfies ThemeSourceCompareItem;
    })
    .sort((left, right) => toTimestamp(right.latestRecordAt) - toTimestamp(left.latestRecordAt));

  const diagnostic = detail.theme.type === "financial_event"
    ? buildFinancialEventDiagnostic({
        records,
        sources: detail.sources,
        coveredCount,
      })
    : null;

  return {
    headline: "跨来源最新快照",
    summary:
      coveredCount > 0
        ? "已按来源展示最近一条标准化结果，适合快速确认哪些渠道刚刚更新、哪些来源还没有产出新记录。"
        : "当前还没有可用于跨来源比较的标准化记录。",
    diagnostic,
    stats: [
      `已覆盖 ${coveredCount}/${detail.sources.length} 个来源`,
      latestAt ? `最近更新：${new Date(latestAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }).replace(/\//g, "-")}` : "最近更新暂无",
      records.length > 0 ? `累计展示 ${records.length} 条最近记录样本` : "记录样本暂无",
      detail.sources.some((source) => source.status === "warning") ? "存在异常来源，需结合状态页复核" : "当前来源状态整体稳定",
    ],
    items,
  };
}
