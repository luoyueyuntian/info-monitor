import type { ThemeSummaryInsight } from "@info-monitor/shared-contracts";
import type { ThemeSummary } from "./api";
import { themeImpactTone } from "./impact";

export type { ThemeSummaryInsight };

export function buildThemeSummaryInsight(theme: ThemeSummary): ThemeSummaryInsight {
  if (theme.sourceHealth === "warning") {
    return {
      headline: "来源异常需先复核",
      summary: "先排除漏抓和异常来源干扰，再继续判断这个主题当前的方向和优先级。",
    };
  }

  if ((theme.openEventCount ?? 0) > 0) {
    if (theme.type === "price" && theme.sourceCount > 1) {
      return {
        headline: "当前有待处理比价信号",
        summary: "先看最低来源和价差，再决定这次低价是否值得继续跟进。",
      };
    }

    if (theme.type === "financial_event") {
      return {
        headline: "当前有待处理方向信号",
        summary: "先确认最新一轮金融事件会不会改变短期判断，再回看方向是否正在强化。",
      };
    }

    return {
      headline: "当前有待处理事件",
      summary: "这批新事件还没完成首轮判断，适合优先进入主题事件区继续处理。",
    };
  }

  if (theme.type === "price" && theme.latestEventSignal === "30d_low" && theme.sourceCount > 1) {
    return {
      headline: "多来源快照已出现新低信号",
      summary: "适合优先看最低来源、当前价差，以及连续快照里价格是否仍在下探。",
    };
  }

  if (theme.type === "price" && theme.sourceCount > 1) {
    return {
      headline: "当前有多个价格来源可交叉比对",
      summary: "适合先看最低来源与价差，再判断这轮价格变化是否已经有明显机会。",
    };
  }

  if (theme.type === "financial_event" && theme.latestEventSignal === "liquidity_injection") {
    return {
      headline: "最近流动性方向偏宽松",
      summary: "适合继续确认最近几轮方向是否在连续强化，而不是只看一条公告下判断。",
    };
  }

  if (theme.type === "financial_event" && theme.latestEventSignal === "liquidity_withdrawal") {
    return {
      headline: "最近流动性方向偏收紧",
      summary: "适合继续确认最近几轮方向是否在连续强化，再决定是否提高关注级别。",
    };
  }

  if (themeImpactTone(theme) === "negative") {
    return {
      headline: "当前判断偏谨慎",
      summary: "最新信号对这个主题不算中性，适合优先回看分析或时间线确认影响是否在扩大。",
    };
  }

  if (themeImpactTone(theme) === "positive") {
    return {
      headline: "当前判断偏积极",
      summary: "最新信号已经开始偏向机会侧，适合继续确认这次变化是不是能持续成立。",
    };
  }

  if (theme.latestEventSignal === "content_update") {
    return {
      headline: "最近有新的内容更新",
      summary: "适合先确认这次更新影响范围，再决定是否要继续沉淀成更明确的动作。",
    };
  }

  if (theme.latestEventSignal === "new_announcement" || theme.latestEventSignal === "new_financial_event") {
    return {
      headline: "最近有新的关键发布",
      summary: "适合先读最新发布，再判断它是否会改变当前主题的跟踪重点。",
    };
  }

  return {
    headline: "当前以持续观察为主",
    summary: "最近还没有特别强的新判断，当前更适合继续低成本巡检和等待下一轮更新。",
  };
}
