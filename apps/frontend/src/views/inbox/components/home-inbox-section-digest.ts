import type { EventSummary } from "../../../lib/api";
import { eventImpactTone } from "../../../lib/impact";

function buildSectionJudgementFromLatestEvent(event: EventSummary | undefined) {
  if (!event) {
    return null;
  }

  const inferredInfoType =
    event.infoType ??
    (event.signal === "30d_low"
      ? "price"
      : event.signal === "liquidity_injection" ||
          event.signal === "liquidity_withdrawal" ||
          event.signal === "new_financial_event" ||
          event.signal === "bullish" ||
          event.signal === "bearish"
        ? "financial_event"
        : event.signal === "content_update"
          ? "content_update"
          : "news_announcement");

  if (inferredInfoType === "price") {
    if (event.signal === "30d_low") {
      return "这批价格事件里已经出现新低信号，优先确认最低价是否真实可成交。";
    }

    return eventImpactTone(event) === "negative"
      ? "这批价格事件里出现了更偏谨慎的变化，适合先排除一次性波动。"
      : "这批价格事件更适合结合多来源快照继续观察。";
  }

  if (inferredInfoType === "financial_event") {
    if (event.signal === "liquidity_injection") {
      return "这批金融事件最近偏向流动性投放，适合继续确认宽松方向是否在强化。";
    }

    if (event.signal === "liquidity_withdrawal") {
      return "这批金融事件最近偏向流动性回笼，适合继续确认收紧方向是否在强化。";
    }

    return "这批金融事件更适合结合最近几轮方向变化继续判断。";
  }

  if (inferredInfoType === "content_update") {
    return "这批内容更新更适合先确认影响范围，再决定是否继续沉淀为动作。";
  }

  return "这批发布类事件更适合先读正文，再判断是否需要升级关注。";
}

export function buildInboxSectionDigest(
  sectionId: string,
  events: EventSummary[],
  recentCount: number,
  totalCount: number,
) {
  const latestEvent = events[0];
  const negativeCount = events.filter((event) => eventImpactTone(event) === "negative").length;
  const positiveCount = events.filter((event) => eventImpactTone(event) === "positive").length;
  const neutralCount = events.length - negativeCount - positiveCount;

  if (sectionId === "price-signals") {
    return {
      headline:
        latestEvent?.signal === "30d_low"
          ? "当前价格信号偏积极"
          : negativeCount > 0
            ? "当前价格信号里有偏利空变化"
            : "当前价格仍以观察为主",
      summary:
        latestEvent?.signal === "30d_low"
          ? "最近已经出现新低类信号，优先核对低价是否真实可成交。"
          : negativeCount > 0
            ? `当前这一分区里有 ${negativeCount} 条偏利空事件，建议优先确认是否只是一次性波动。`
            : "当前还没有更强的价格触发信号，建议继续观察不同来源的变化。",
      highlights: [
        buildSectionJudgementFromLatestEvent(latestEvent) ?? "当前这批价格事件更适合作为持续观察输入。",
        recentCount > 0 ? `最近24小时新增 ${recentCount} 条价格事件。` : "最近24小时没有新增价格事件。",
        latestEvent ? `最新价格事件：${latestEvent.title}` : "当前没有最新价格事件。",
        events.length > 0 ? `影响判断：${positiveCount} 条偏利好、${negativeCount} 条偏利空、${neutralCount} 条中性。` : "当前还没有可用的影响判断。",
        totalCount > 0 ? `累计可查看 ${totalCount} 条价格相关事件。` : "当前还没有累计价格事件。",
      ],
      primaryTarget: latestEvent
        ? {
            path: `/themes/${latestEvent.themeId}`,
            query: { section: (latestEvent.status ?? "open") === "open" ? "events" : "trend" },
          }
        : null,
      primaryActionLabel: (latestEvent?.status ?? "open") === "open" ? "查看重点主题待处理事件" : "查看重点主题趋势",
    };
  }

  if (sectionId === "content-updates") {
    return {
      headline:
        negativeCount > 0
          ? "近期内容更新里有需要谨慎复核的变化"
          : positiveCount > 0
            ? "近期内容更新里有值得跟进的积极变化"
            : recentCount > 0
              ? "近期内容更新值得优先查看"
              : "当前内容更新以持续观察为主",
      summary:
        negativeCount > 0
          ? `当前这一分区里有 ${negativeCount} 条偏利空内容更新，适合先确认这次变化会不会影响后续判断。`
          : recentCount > 0
          ? "最近24小时已有新的产品或页面更新，适合先确认更新了什么，再判断是否值得继续跟踪。"
          : "当前没有新的内容更新信号，建议继续保持对产品和页面变化的观察。",
      highlights: [
        buildSectionJudgementFromLatestEvent(latestEvent) ?? "当前这批内容更新更适合作为持续观察输入。",
        recentCount > 0 ? `最近24小时新增 ${recentCount} 条内容更新事件。` : "最近24小时没有新增内容更新事件。",
        latestEvent ? `最新内容更新：${latestEvent.title}` : "当前没有最新内容更新事件。",
        events.length > 0 ? `影响判断：${positiveCount} 条偏利好、${negativeCount} 条偏利空、${neutralCount} 条中性。` : "当前还没有可用的影响判断。",
        totalCount > 0 ? `累计可查看 ${totalCount} 条内容更新事件。` : "当前还没有累计内容更新事件。",
      ],
      primaryTarget: latestEvent
        ? {
            path: `/themes/${latestEvent.themeId}`,
            query: { section: (latestEvent.status ?? "open") === "open" ? "events" : "analysis" },
          }
        : null,
      primaryActionLabel: (latestEvent?.status ?? "open") === "open" ? "查看重点主题待处理事件" : "查看重点主题分析",
    };
  }

  if (sectionId === "official-releases") {
    return {
      headline:
        negativeCount > 0
          ? "近期官方发布里有偏利空信号"
          : positiveCount > 0
            ? "近期官方发布里有偏利好信号"
            : recentCount > 0
              ? "近期官方发布值得优先阅读"
              : "当前以持续跟踪官方发布为主",
      summary:
        negativeCount > 0
          ? `当前这一分区里有 ${negativeCount} 条偏利空发布，建议先读正文确认是否需要升级关注。`
          : recentCount > 0
          ? "最近24小时已有新发布，建议先读正文，再判断是否需要升级关注。"
          : "当前没有新的官方发布信号，建议继续保持监控。",
      highlights: [
        buildSectionJudgementFromLatestEvent(latestEvent) ?? "当前这批发布类事件更适合作为持续观察输入。",
        recentCount > 0 ? `最近24小时新增 ${recentCount} 条发布相关事件。` : "最近24小时没有新增发布事件。",
        latestEvent ? `最新发布事件：${latestEvent.title}` : "当前没有最新发布事件。",
        events.length > 0 ? `影响判断：${positiveCount} 条偏利好、${negativeCount} 条偏利空、${neutralCount} 条中性。` : "当前还没有可用的影响判断。",
        totalCount > 0 ? `累计可查看 ${totalCount} 条官方发布事件。` : "当前还没有累计发布事件。",
      ],
      primaryTarget: latestEvent
        ? {
            path: `/themes/${latestEvent.themeId}`,
            query: { section: (latestEvent.status ?? "open") === "open" ? "events" : "analysis" },
          }
        : null,
      primaryActionLabel: (latestEvent?.status ?? "open") === "open" ? "查看重点主题待处理事件" : "查看重点主题分析",
    };
  }

  return {
    headline:
      negativeCount > 0
        ? "近期金融事件判断偏谨慎"
        : positiveCount > 0
          ? "近期金融事件判断偏积极"
          : recentCount > 0
            ? "近期金融事件判断有更新"
            : "当前金融事件以历史参考为主",
    summary:
      negativeCount > 0
        ? `当前这一分区里有 ${negativeCount} 条偏利空金融事件，建议优先结合金额、期限和方向重新判断。`
        : recentCount > 0
        ? "最近24小时已有新的金融事件，建议结合金额、期限和方向重新判断。"
        : "当前没有新的金融事件，建议继续等待后续公告或来源更新。",
    highlights: [
      buildSectionJudgementFromLatestEvent(latestEvent) ?? "当前这批金融事件更适合作为持续观察输入。",
      recentCount > 0 ? `最近24小时新增 ${recentCount} 条金融事件。` : "最近24小时没有新增金融事件。",
      latestEvent ? `最新金融事件：${latestEvent.title}` : "当前没有最新金融事件。",
      events.length > 0 ? `影响判断：${positiveCount} 条偏利好、${negativeCount} 条偏利空、${neutralCount} 条中性。` : "当前还没有可用的影响判断。",
      totalCount > 0 ? `累计可查看 ${totalCount} 条金融事件。` : "当前还没有累计金融事件。",
    ],
    primaryTarget: latestEvent
      ? {
          path: `/themes/${latestEvent.themeId}`,
          query: { section: (latestEvent.status ?? "open") === "open" ? "events" : "analysis" },
        }
      : null,
    primaryActionLabel: (latestEvent?.status ?? "open") === "open" ? "查看重点主题待处理事件" : "查看重点主题分析",
  };
}
