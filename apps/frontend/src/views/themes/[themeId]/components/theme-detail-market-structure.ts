import type { ThemeDetail } from "../../../../lib/api";

export type MarketStructureLeader = {
  code: string;
  label: string;
  appearances: number;
  averageNetInflowBillion: number | null;
  latestNetInflowBillion: number | null;
  latestChangePercent: number | null;
  latestLeadingStockName: string | null;
};

export type MarketStructureDailyLeader = {
  date: string;
  label: string;
  netInflowBillion: number | null;
  changePercent: number | null;
};

export type MarketStructureTrendData = {
  headline: string;
  summary: string;
  stats: string[];
  leaders: MarketStructureLeader[];
  dailyLeaders: MarketStructureDailyLeader[];
};

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

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replace(/\//g, "-");
}

export function buildMarketStructureTrendData(detail: ThemeDetail): MarketStructureTrendData | null {
  if (detail.theme.type !== "financial_event") {
    return null;
  }

  const marketRecords = detail.records
    .filter(
      (record) =>
        record.infoType === "financial_event" &&
        record.content.event_class === "market_overview" &&
        record.content.market_region === "a_share" &&
        Array.isArray(record.content.sector_flows),
    )
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  if (!marketRecords.length) {
    return null;
  }

  const recentRecords = marketRecords.slice(0, 5);
  const sectorMap = new Map<string, MarketStructureLeader>();
  const dailyLeaders: MarketStructureDailyLeader[] = [];

  for (const record of recentRecords) {
    const sectorFlows = Array.isArray(record.content.sector_flows)
      ? (record.content.sector_flows as Array<Record<string, unknown>>)
      : [];
    const leader = sectorFlows[0];

    if (leader) {
      dailyLeaders.push({
        date: formatDateLabel(record.occurredAt),
        label: typeof leader.label === "string" ? leader.label : "未命名板块",
        netInflowBillion: toNumber(leader.net_inflow_billion ?? leader.netInflowBillion),
        changePercent: toNumber(leader.change_percent ?? leader.changePercent),
      });
    }

    for (const sector of sectorFlows.slice(0, 5)) {
      const code = typeof sector.code === "string" ? sector.code : "";
      const label = typeof sector.label === "string" ? sector.label : "未命名板块";
      const netInflowBillion = toNumber(sector.net_inflow_billion ?? sector.netInflowBillion);
      const changePercent = toNumber(sector.change_percent ?? sector.changePercent);
      const leadingStockName = typeof sector.leading_stock_name === "string"
        ? sector.leading_stock_name
        : typeof sector.leadingStockName === "string"
          ? sector.leadingStockName
          : null;

      const current = sectorMap.get(code) ?? {
        code,
        label,
        appearances: 0,
        averageNetInflowBillion: 0,
        latestNetInflowBillion: null,
        latestChangePercent: null,
        latestLeadingStockName: null,
      };

      const nextAppearances = current.appearances + 1;
      const prevTotal = (current.averageNetInflowBillion ?? 0) * current.appearances;
      const nextAverage = netInflowBillion == null
        ? current.averageNetInflowBillion
        : (prevTotal + netInflowBillion) / nextAppearances;

      sectorMap.set(code, {
        code,
        label,
        appearances: nextAppearances,
        averageNetInflowBillion: nextAverage,
        latestNetInflowBillion: current.latestNetInflowBillion ?? netInflowBillion,
        latestChangePercent: current.latestChangePercent ?? changePercent,
        latestLeadingStockName: current.latestLeadingStockName ?? leadingStockName,
      });
    }
  }

  const leaders = [...sectorMap.values()]
    .sort((left, right) => {
      if (right.appearances !== left.appearances) {
        return right.appearances - left.appearances;
      }

      return (right.averageNetInflowBillion ?? 0) - (left.averageNetInflowBillion ?? 0);
    })
    .slice(0, 6);

  const repeatedLeaders = leaders.filter((item) => item.appearances >= 2).length;
  const headline = repeatedLeaders > 0
    ? "板块资金主线正在重复强化"
    : "板块资金主线仍在快速轮动";
  const summary = repeatedLeaders > 0
    ? "最近几个交易日里，部分行业反复进入资金流前列，说明市场主线正在逐步聚焦。"
    : "最近几个交易日的领先行业切换较快，说明当前更偏题材轮动而不是单一主线。";
  const stats = [
    `观察最近 ${recentRecords.length} 个交易日`,
    `重复上榜板块 ${repeatedLeaders} 个`,
    dailyLeaders[0] ? `最近领先板块 ${dailyLeaders[0].label}` : "最近领先板块暂无",
  ];

  return {
    headline,
    summary,
    stats,
    leaders,
    dailyLeaders,
  };
}
