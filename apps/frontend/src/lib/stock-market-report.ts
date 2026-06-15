import type { StockMarketCloseReport, ThemeDetail } from "./api";

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

export function buildStockMarketCloseReport(detail: ThemeDetail | null): StockMarketCloseReport | null {
  if (!detail?.marketOverview) {
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
      return `${mover.label} ${formatSignedPercent(mover.changePercent) ?? ""} · ${lead}`.trim();
    }),
    ...(hk?.topMovers ?? []).slice(0, 1).map((mover) => {
      const lead = mover.reasons?.[0] ?? "港股异动龙头，可用于观察跨市场风险偏好。";
      return `${mover.label} ${formatSignedPercent(mover.changePercent) ?? ""} · ${lead}`.trim();
    }),
    ...(aShare?.topDecliners ?? []).slice(0, 1).map((mover) => {
      const lead = mover.reasons?.[0] ?? "A股弱势个股，适合用于验证回撤压力。";
      return `${mover.label} ${formatSignedPercent(mover.changePercent) ?? ""} · ${lead}`.trim();
    }),
  ].slice(0, 4);

  const actionItems: string[] = [];

  if (sectorFocus[0]) {
    actionItems.push(`优先复盘 ${sectorFocus[0].split(" · ")[0]}，判断吸金主线是否具备延续性。`);
  }

  if (aShare?.topMovers?.[0]) {
    const mover = aShare.topMovers[0];
    actionItems.push(
      mover.reasons?.[0]
        ? `跟踪 ${mover.label}，重点确认「${mover.reasons[0]}」是否会延续到下一交易日。`
        : `跟踪 ${mover.label}，确认A股强势异动是否只是情绪脉冲。`,
    );
  }

  if (hk?.topMovers?.[0]) {
    actionItems.push(`对照港股异动龙头 ${hk.topMovers[0].label}，判断南向资金是否还在同步支撑。`);
  }

  if (!actionItems.length) {
    actionItems.push("当前盘后结构信号有限，下一交易日优先观察新的板块资金主线。");
  }

  return {
    date: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }),
    headline: overview.headline,
    summary: overview.summary,
    keySignals,
    timeline: [],
    catalystSummary: {
      primary: [],
      secondary: [],
      background: [],
    },
    sectorFocus,
    moverFocus,
    announcementFocus: [],
    sourceClues: [],
    moverCards: [],
    actionItems,
  };
}
