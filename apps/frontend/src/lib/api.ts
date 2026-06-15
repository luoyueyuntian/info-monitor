import type {
  DailySummary,
  DailySummaryItem,
  DashboardSummary,
  EventDetail,
  EventSummary,
  FeedbackAggregation,
  FeedbackAggregationItem,
  InboxSectionCounts,
  NotificationItem,
  NotificationPreference,
  NotificationPreferenceInput,
  RuleConfiguration,
  RuleConfigurationInput,
  StockMarketCloseReport,
  StockMarketCloseReportSnapshot,
  SourceDetail,
  SourceStatus,
  ThemeAnalysis,
  ThemeDetail,
  ThemeMarketOverview,
  ThemeRecord,
  ThemeSummary,
} from "@info-monitor/shared-contracts";

import { fallbackEvents, fallbackNotifications, fallbackSources, fallbackThemes } from "./demo-fixtures";
import { buildStockMarketCloseReport } from "./stock-market-report";

export type {
  DashboardSummary,
  EventDetail,
  EventSummary,
  InboxSectionCounts,
  NotificationItem,
  NotificationPreference,
  NotificationPreferenceInput,
  RuleConfiguration,
  RuleConfigurationInput,
  StockMarketCloseReport,
  StockMarketCloseReportSnapshot,
  SourceDetail,
  SourceStatus,
  ThemeAnalysis,
  ThemeDetail,
  ThemeMarketOverview,
  ThemeRecord,
  ThemeSummary,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

function buildFallbackEventExplanation(event: EventSummary) {
  if (event.infoType === "price") {
    return {
      confidence: 70,
      headline: "这是一个直接影响买入判断的价格信号",
      impact: "当前事件说明该标的在最近一段时间里出现了更低价格，值得优先复核是否为真实可成交低价。",
      whyItMatters: [
        "价格类信号会直接影响是否继续关注、是否对比其他平台、是否考虑出手。",
        "如果是同配置且可成交的低价，通常意味着当前观察价值上升。",
      ],
      actions: [
        "先核对规格、成色、附件和成交条件，确认是否真的是同配置低价。",
        "如需更高把握，继续补跑其他来源，确认低价是否仍然存在。",
      ],
    };
  }

  if (event.infoType === "financial_event") {
    return {
      confidence: 70,
      headline: "这是一个会改变短期市场判断的金融事件",
      impact: "当前事件通常意味着流动性方向、政策操作或市场预期发生了变化，需要结合金额、期限和方向一起判断。",
      whyItMatters: [
        "金融事件会影响你对短期市场环境是偏宽松、偏收紧还是中性的判断。",
        "如果后续同类事件连续出现，往往意味着判断方向正在强化。",
      ],
      actions: [
        "优先读取结构化字段，确认方向、金额、期限和操作类型。",
        "再结合后续公告和市场表现，判断是否需要调整自己的观察或交易计划。",
      ],
    };
  }

  if (event.infoType === "content_update") {
    return {
      confidence: 70,
      headline: "这是一个需要快速判断影响范围的内容更新",
      impact: "当前事件说明监控对象刚刚发生了新的功能、版本或页面内容变化，重点是先判断它会影响哪些主题和后续动作。",
      whyItMatters: [
        "内容更新通常是产品能力、运营动作或竞品节奏变化的直接信号。",
        "如果相似更新连续出现，往往说明当前路线图或市场动作正在被持续强化。",
      ],
      actions: [
        "优先查看更新类型、原文链接和摘要，确认这次具体改了什么。",
        "再结合历史更新和你的关注主题，判断是否需要跟进分析、记录竞品动作或转成新的任务。",
      ],
    };
  }

  return {
    confidence: 70,
    headline: "这是一个值得继续跟踪的官方发布信号",
    impact: "当前事件说明官方渠道有了新的发布，可能会影响你对主题的后续判断，但通常还需要先读正文确认含义。",
    whyItMatters: [
      "官方发布通常是主题判断变化的上游来源。",
      "是否真正构成利好、利空或中性，需要结合发布正文和上下文来确认。",
    ],
    actions: [
      "先打开原始来源，确认发布正文到底说了什么。",
      "如果影响较大，再把它转成更明确的判断或后续行动。",
    ],
  };
}

function buildFallbackThemeAnalysis(input: {
  type: string;
  latestInsight?: string | null;
  events: Array<{ title: string; signal: string; occurredAt: string; summary: string }>;
  sources: Array<{ status: string; isPaused?: boolean; latestRunStatus?: string | null }>;
  records?: Array<{ occurredAt: string; content: Record<string, unknown> }>;
}) {
  const latestEvent = input.events[0];
  const threshold = Date.now() - 24 * 60 * 60 * 1000;
  const recentEventCount = input.events.filter((event) => {
    const time = new Date(event.occurredAt).getTime();
    return !Number.isNaN(time) && time >= threshold;
  }).length;
  const warningCount = input.sources.filter((source) => source.status === "warning").length;
  const pausedCount = input.sources.filter((source) => source.isPaused).length;
  const pendingCount = input.sources.filter((source) => source.latestRunStatus === "pending").length;
  const latestPrice =
    input.type === "price" && input.records?.length ? Number(input.records[0].content.price ?? NaN) : NaN;
  const olderPrice =
    input.type === "price" && input.records && input.records.length > 1
      ? Number(input.records[input.records.length - 1].content.price ?? NaN)
      : NaN;
  const priceDelta =
    Number.isFinite(latestPrice) && Number.isFinite(olderPrice) && olderPrice !== 0
      ? ((latestPrice - olderPrice) / olderPrice) * 100
      : null;

  if (input.type === "price") {
    return {
      tone: latestEvent?.signal === "30d_low" ? "positive" : "neutral",
      headline: latestEvent?.signal === "30d_low" ? "当前价格处于近期低位" : "价格监控处于观察中",
      summary:
        latestEvent?.signal === "30d_low"
          ? `最近一次信号提示已出现 30 天新低，当前抓到的关键价格信息为 ${input.latestInsight ?? "暂无"}。`
          : `当前价格主题最近抓到的关键信息为 ${input.latestInsight ?? "暂无"}，建议继续观察波动。`,
      keyPoints: [
        latestEvent ? `最新信号：${latestEvent.title}` : "最近没有新的价格信号。",
        input.latestInsight ? `最新价格摘要：${input.latestInsight}` : "最近没有可用的价格摘要。",
        `来源状态：${input.sources.length} 个来源中，${warningCount} 个异常，${pausedCount} 个暂停。`,
      ],
      risks: [
        warningCount > 0 ? "存在异常来源，当前价格结论需要先复核抓取结果。" : "当前未发现异常来源。",
        pausedCount > 0 ? "有来源处于暂停状态，跨平台比价可能不完整。" : "当前来源覆盖完整度较好。",
      ],
      actions: [
        "优先复核最低价是否为同配置、可成交且非异常挂价。",
        pendingCount > 0 ? "等待排队中的来源完成后，再判断是否要跟进。" : "必要时立即运行全部来源，确认低价是否仍然成立。",
      ],
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
      signalAccumulation: { bullish: 0, bearish: 0, neutral: 0, recentBullish: 0, recentBearish: 0 },
      supportingSources: [],
      conflictingSources: [],
      stance: "neutral" as const,
    } satisfies ThemeAnalysis;
  }

  if (input.type === "financial_event") {
    const marketRecords = (input.records ?? []).filter(
      (record) => record.content.event_class === "market_overview",
    );

    if (marketRecords.length > 0) {
      const latestA = marketRecords.find((record) => record.content.market_region === "a_share");
      const latestHk = marketRecords.find((record) => record.content.market_region === "hk");
      const aBenchmark = typeof latestA?.content.benchmark_change_percent === "number"
        ? latestA.content.benchmark_change_percent
        : null;
      const hkBenchmark = typeof latestHk?.content.benchmark_change_percent === "number"
        ? latestHk.content.benchmark_change_percent
        : null;
      const allBenchmarks = [aBenchmark, hkBenchmark].filter((value): value is number => value != null);
      const averageBenchmark = allBenchmarks.length > 0
        ? allBenchmarks.reduce((sum, value) => sum + value, 0) / allBenchmarks.length
        : null;

      return {
        tone:
          averageBenchmark != null && averageBenchmark > 0.8
            ? "positive"
            : averageBenchmark != null && averageBenchmark < -0.8
              ? "negative"
              : "neutral",
        headline:
          latestA && latestHk
            ? "A股与港股日度概览已更新"
            : latestA
              ? "A股日度概览已更新"
              : "港股日度概览已更新",
        summary: latestEvent?.summary ?? "当前主题会按日度收盘快照汇总 A股、港股 指数表现与资金流向。",
        keyPoints: [
          latestA
            ? `A股: ${typeof latestA.content.description === "string" ? latestA.content.description : "主要指数与北向资金已更新。"}`
            : null,
          latestHk
            ? `港股: ${typeof latestHk.content.description === "string" ? latestHk.content.description : "主要指数与南向资金已更新。"}`
            : null,
          `来源状态：${input.sources.length} 个来源中，${warningCount} 个异常，${pausedCount} 个暂停。`,
        ].filter((item): item is string => Boolean(item)),
        risks: [
          warningCount > 0 ? "存在异常来源，市场概览可能缺少最新一轮数据。" : "当前未发现异常来源。",
          pausedCount > 0 ? "有来源被暂停，A股或港股任一侧的收盘概览都可能不完整。" : "当前来源运行状态较稳定。",
        ],
        actions: [
          "先判断指数方向和资金流是否同向，再确认当天整体行情结论。",
          "若 A股 与 港股 出现分化，建议把两边的判断拆开复盘。",
        ],
        recentChange: {
          headline: recentEventCount > 0 ? "最近24小时市场概览有更新" : "最近24小时没有新的市场概览",
          summary:
            recentEventCount > 0
              ? "新的收盘快照已经入库，可以直接比较 A股 和 港股 的日内表现。"
              : "当前还没有新的日度概览，建议等待下一轮收盘抓取。",
          highlights: [
            latestA ? "A股指数与北向资金已更新。" : null,
            latestHk ? "港股指数与南向资金已更新。" : null,
            `最近24小时新增 ${recentEventCount} 条金融事件。`,
          ].filter((item): item is string => Boolean(item)),
        },
        trend: {
          headline:
            averageBenchmark == null
              ? "当前市场趋势样本不足"
              : averageBenchmark > 0.8
                ? "跨市场指数整体偏强"
                : averageBenchmark < -0.8
                  ? "跨市场指数整体偏弱"
                  : "跨市场指数整体震荡",
          summary:
            averageBenchmark == null
              ? "当前还缺少足够的市场概览样本。"
              : `按当前可用收盘概览估算，核心指数均值变化约为 ${averageBenchmark >= 0 ? "+" : ""}${averageBenchmark.toFixed(2)}%。`,
          highlights: [
            latestA ? "A股跟踪了上证、深证、创业板表现。" : null,
            latestHk ? "港股跟踪了恒指、国企指数表现。" : null,
            input.latestInsight ? `最近摘要：${input.latestInsight}` : "最近没有可用摘要。",
          ].filter((item): item is string => Boolean(item)),
        },
        signalAccumulation: { bullish: 0, bearish: 0, neutral: 0, recentBullish: 0, recentBearish: 0 },
        supportingSources: [],
        conflictingSources: [],
        stance: averageBenchmark != null && averageBenchmark > 0.8
          ? "bullish"
          : averageBenchmark != null && averageBenchmark < -0.8
            ? "bearish"
            : "watch",
      } satisfies ThemeAnalysis;
    }

    return {
      tone:
        latestEvent?.signal === "liquidity_injection"
          ? "positive"
          : latestEvent?.signal === "liquidity_withdrawal"
            ? "negative"
            : "neutral",
      headline:
        latestEvent?.signal === "liquidity_injection"
          ? "近期流动性信号偏宽松"
          : latestEvent?.signal === "liquidity_withdrawal"
            ? "近期流动性信号偏收紧"
            : "近期流动性信号偏中性",
      summary: latestEvent?.summary ?? "当前还没有足够的新金融事件信号，建议继续跟踪后续公告。",
      keyPoints: [
        latestEvent ? `最新事件：${latestEvent.title}` : "最近没有新的金融事件。",
        input.latestInsight ? `结构化摘要：${input.latestInsight}` : "最近没有结构化摘要。",
        `来源状态：${input.sources.length} 个来源中，${warningCount} 个异常，${pausedCount} 个暂停。`,
      ],
      risks: [
        warningCount > 0 ? "存在异常来源，当前金融判断可能缺少部分公告。" : "当前未发现异常来源。",
        pausedCount > 0 ? "有来源被暂停，可能错过后续政策变化。" : "当前来源运行状态较稳定。",
      ],
      actions: [
        "结合最新方向标签和金额、期限信息，判断对市场短期流动性的影响。",
        "若该主题用于交易参考，建议与后续官方公告和市场反应交叉验证。",
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
      signalAccumulation: { bullish: 0, bearish: 0, neutral: 0, recentBullish: 0, recentBearish: 0 },
      supportingSources: [],
      conflictingSources: [],
      stance: "neutral" as const,
    } satisfies ThemeAnalysis;
  }

  if (input.type === "content_update") {
    return {
      tone: "neutral",
      headline: latestEvent ? "近期内容更新值得优先复核" : "当前以持续跟踪内容更新为主",
      summary:
        latestEvent?.summary ??
        "当前还没有新的内容更新事件，建议继续保持监控，等待下一轮页面变化或版本发布。",
      keyPoints: [
        latestEvent ? `最新更新：${latestEvent.title}` : "最近没有新的内容更新事件。",
        input.latestInsight ? `最近更新摘要：${input.latestInsight}` : "最近没有可用的结构化更新摘要。",
        `来源状态：${input.sources.length} 个来源中，${warningCount} 个异常，${pausedCount} 个暂停。`,
      ],
      risks: [
        warningCount > 0 ? "存在异常来源，可能漏掉部分更新内容。" : "当前未发现异常来源。",
        pausedCount > 0 ? "有来源处于暂停状态，跨渠道更新对比可能不完整。" : "当前来源覆盖相对完整。",
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
      signalAccumulation: { bullish: 0, bearish: 0, neutral: 0, recentBullish: 0, recentBearish: 0 },
      supportingSources: [],
      conflictingSources: [],
      stance: "neutral" as const,
    } satisfies ThemeAnalysis;
  }

  return {
    tone: latestEvent ? "neutral" : "neutral",
    stance: "neutral" as const,
    headline: latestEvent ? "近期官方发布值得继续跟踪" : "当前以持续跟踪为主",
    summary: latestEvent?.summary ?? "当前还没有新的官方发布信号，建议继续保持监控。",
    keyPoints: [
      latestEvent ? `最新发布：${latestEvent.title}` : "最近没有新的官方发布。",
      input.latestInsight ? `最近摘要：${input.latestInsight}` : "最近没有可用摘要。",
      `来源状态：${input.sources.length} 个来源中，${warningCount} 个异常，${pausedCount} 个暂停。`,
    ],
    risks: [
      warningCount > 0 ? "存在异常来源，可能漏掉部分官方发布。" : "当前未发现异常来源。",
      pausedCount > 0 ? "有来源处于暂停状态，信息覆盖可能不完整。" : "当前来源覆盖相对完整。",
    ],
    actions: [
      "优先阅读最新发布正文，确认是否需要转成更明确的利好/利空判断。",
      pendingCount > 0 ? "等待排队中的来源完成后，再汇总本轮判断。" : "如需更高把握，可立即补跑相关来源。",
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
    signalAccumulation: { bullish: 0, bearish: 0, neutral: 0, recentBullish: 0, recentBearish: 0 },
    supportingSources: [],
    conflictingSources: [],
  } satisfies ThemeAnalysis;
}

function buildFallbackThemeArtifacts(theme: ThemeSummary, events: EventSummary[]) {
  // Eastmoney Moutai: no events, simple price baseline
  if (theme.id === "theme-eastmoney-moutai") {
    const records: ThemeRecord[] = [
      {
        id: `${theme.id}-record-1`,
        sourceId: "source-eastmoney-moutai-kline",
        sourceName: "东方财富 K 线: 600519",
        title: "Kweichow Moutai Daily Close",
        occurredAt: "2026-05-31T15:00:00Z",
        infoType: "price",
        content: {
          price: 1728.52,
          currency: "CNY",
          symbol: "600519",
          url: "https://quote.eastmoney.com/sh600519.html",
        },
      },
    ];

    return {
      history: [
        { at: "2026-05-31T15:00:00Z", label: "首个日线价格样本已入库" },
      ],
      breakdown: null,
      timeline: [
        {
          id: `${theme.id}-timeline-run-1`,
          kind: "run",
          at: "2026-05-31T15:00:00Z",
          title: "首次抓取完成",
          summary: "已完成东方财富茅台日线数据采集。",
          meta: { status: "completed", triggerType: "seed", sourceName: "东方财富 K 线: 600519" },
        },
      ],
      records,
    };
  }

  if (theme.id === "theme-cn-hk-market-overview") {
    const records: ThemeRecord[] = [
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
            "三大指数集体收涨，成长风格更强。",
            "北向资金延续净流入，市场风险偏好改善。",
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
            "港股同步修复，但弹性仍弱于A股。",
            "南向资金继续净买入，对港股形成托底。",
          ],
          description: "港股核心指数震荡偏强，南向资金保持净买入，市场以修复为主。",
        },
      },
    ];

    const marketOverview: ThemeMarketOverview = {
      headline: "A股与港股当日表现分化",
      summary: "A股指数弹性更强，北向资金回暖；港股同步修复，南向资金继续净买入。",
      crossMarketHighlights: ["A股整体偏强", "港股震荡修复"],
      snapshots: [
        {
          market: "a_share",
          marketLabel: "A股",
          occurredAt: "2026-06-15T15:00:00+08:00",
          tone: "positive",
          directionLabel: "偏强",
          headline: "A股整体偏强",
          summary: "A股主要指数集体收涨，北向资金保持净流入，全天情绪偏强。",
          benchmarkName: "A股核心指数均值",
          benchmarkChangePercent: 1.88,
          fundFlowDirection: "inflow",
          fundFlowNetBillion: 18.4,
          fundFlowTurnoverBillion: 1124.6,
          fundFlowCurrency: "CNY",
          indices: [
            { code: "000001", label: "上证指数", latest: 4083.43, changePercent: 1.29 },
            { code: "399001", label: "深证成指", latest: 15266.61, changePercent: 2.03 },
            { code: "399006", label: "创业板指", latest: 3919.62, changePercent: 2.33 },
          ],
          sectorFlows: [
            { code: "BK1201", label: "电子", changePercent: 4.35, netInflowBillion: 184.77, leadingStockName: "东山精密", leadingStockCode: "002384" },
            { code: "BK1036", label: "半导体", changePercent: 3.99, netInflowBillion: 67.86, leadingStockName: "兆易创新", leadingStockCode: "603986" },
            { code: "BK1203", label: "非银金融", changePercent: 2.35, netInflowBillion: 29.65, leadingStockName: "东方财富", leadingStockCode: "300059" },
          ],
          topMovers: [
            { code: "301566", label: "达利凯普", latest: 36.64, changePercent: 20.01, turnoverBillion: 11.93 },
            { code: "300726", label: "宏达电子", latest: 72.41, changePercent: 20.0, turnoverBillion: 17.41 },
            { code: "300570", label: "太辰光", latest: 222.1, changePercent: 20.0, turnoverBillion: 61.78 },
          ],
          topDecliners: [
            { code: "600000", label: "示例回调股A", latest: 12.44, changePercent: -6.21, turnoverBillion: 8.42 },
            { code: "000001", label: "示例回调股B", latest: 9.88, changePercent: -5.74, turnoverBillion: 6.35 },
          ],
          highlights: ["A股核心指数均值 +1.88%", "资金面 +18.40 亿CNY", "北向资金延续净流入，市场风险偏好改善。"],
        },
        {
          market: "hk",
          marketLabel: "港股",
          occurredAt: "2026-06-15T16:00:00+08:00",
          tone: "neutral",
          directionLabel: "震荡",
          headline: "港股震荡修复",
          summary: "港股核心指数震荡偏强，南向资金保持净买入，市场以修复为主。",
          benchmarkName: "港股核心指数均值",
          benchmarkChangePercent: 0.72,
          fundFlowDirection: "inflow",
          fundFlowNetBillion: 20.51,
          fundFlowTurnoverBillion: 323.26,
          fundFlowCurrency: "HKD",
          indices: [
            { code: "HSI", label: "恒生指数", latest: 24921.38, changePercent: 0.82 },
            { code: "HSCEI", label: "国企指数", latest: 8426.28, changePercent: 0.62 },
          ],
          topMovers: [
            { code: "06658", label: "溜溜梅", latest: 1239.0, changePercent: 184.3, turnoverBillion: 3.39 },
            { code: "01985", label: "美高域", latest: 36.9, changePercent: 39.25, turnoverBillion: 0.14 },
            { code: "02513", label: "智谱", latest: 14430.0, changePercent: 31.54, turnoverBillion: 42.31 },
          ],
          topDecliners: [
            { code: "00999", label: "示例港股回调A", latest: 18.6, changePercent: -7.42, turnoverBillion: 1.22 },
            { code: "00888", label: "示例港股回调B", latest: 7.45, changePercent: -5.11, turnoverBillion: 0.84 },
          ],
          highlights: ["港股核心指数均值 +0.72%", "资金面 +20.51 亿HKD", "南向资金继续净买入，对港股形成托底。"],
        },
      ],
    };

    return {
      history: [
        { at: "2026-06-14T16:00:00+08:00", label: "前一交易日A股与港股表现分化" },
        { at: "2026-06-15T15:00:00+08:00", label: "A股收盘概览更新，市场情绪转强" },
        { at: "2026-06-15T16:00:00+08:00", label: "港股收盘概览更新，南向资金继续净流入" },
      ],
      breakdown: null,
      marketOverview,
      timeline: [
        {
          id: `${theme.id}-timeline-run-1`,
          kind: "run",
          at: "2026-06-15T16:05:00+08:00",
          title: "最新抓取完成",
          summary: "已完成 A股 / 港股 收盘快照与资金流向采集。",
          meta: { status: "completed", triggerType: "schedule", sourceName: "Eastmoney China / Hong Kong Market Overview" },
        },
        {
          id: `${theme.id}-timeline-event-1`,
          kind: "event",
          at: events[0]?.occurredAt ?? "2026-06-15T16:00:00+08:00",
          title: events[0]?.title ?? "A股市场偏强信号",
          summary: events[0]?.summary ?? "The latest China / Hong Kong market overview was recorded.",
          meta: {
            signal: events[0]?.signal ?? "bullish",
            eventType: events[0]?.eventType ?? "financial_direction",
            sourceName: "Eastmoney China / Hong Kong Market Overview",
          },
        },
      ],
      records,
    };
  }

  // PBOC News: news announcement theme
  if (theme.id === "theme-pbc-news") {
    const records: ThemeRecord[] = [
      {
        id: `${theme.id}-record-1`,
        sourceId: "source-pbc-news-list",
        sourceName: "央行新闻发布列表",
        title: "人民银行发布最新货币政策执行报告",
        occurredAt: "2026-06-01T07:38:00Z",
        infoType: "news_announcement",
        content: {
          release_topic_label: "货币政策执行报告",
          publisher: "中国人民银行",
          category: "news_announcement",
          description: "Latest monetary policy report and supporting interpretation.",
        },
      },
    ];

    return {
      history: [
        { at: "2026-06-01T07:38:00Z", label: "检测到新的政策报告发布" },
      ],
      breakdown: null,
      timeline: [
        {
          id: `${theme.id}-timeline-run-1`,
          kind: "run",
          at: "2026-06-01T07:40:00Z",
          title: "最新抓取完成",
          summary: "已完成央行新闻发布列表抓取与标准化。",
          meta: { status: "completed", triggerType: "schedule", sourceName: "央行新闻发布列表" },
        },
        {
          id: `${theme.id}-timeline-event-1`,
          kind: "event",
          at: "2026-06-01T07:38:00Z",
          title: events[0]?.title ?? "PBOC published latest policy report",
          summary: events[0]?.summary ?? "A new monetary policy report was published.",
          meta: {
            signal: events[0]?.signal ?? "new_announcement",
            eventType: events[0]?.eventType ?? "new_release",
            sourceName: "央行新闻发布列表",
          },
        },
      ],
      records,
    };
  }

  if (theme.type === "price") {
    const records: ThemeRecord[] = [
      {
        id: `${theme.id}-record-3`,
        sourceId: "source-xianyu-surface",
        sourceName: "Xianyu Search Results",
        title: "跨平台同配置价格快照",
        occurredAt: "2026-06-01T09:31:00Z",
        infoType: "price",
        content: {
          price: 3999,
          currency: "CNY",
          spec: "16G+512G",
          symbol: "surface-pro-8",
          url: "https://www.goofish.com/",
        },
      },
      {
        id: `${theme.id}-record-2`,
        sourceId: "source-zhuanzhuan-surface",
        sourceName: "Zhuanzhuan Search Results",
        title: "跨平台同配置价格快照",
        occurredAt: "2026-05-31T09:30:00Z",
        infoType: "price",
        content: {
          price: 4120,
          currency: "CNY",
          spec: "16G+512G",
          symbol: "surface-pro-8",
          url: "https://2.taobao.com/",
        },
      },
      {
        id: `${theme.id}-record-1`,
        sourceId: "source-xianyu-surface",
        sourceName: "Xianyu Search Results",
        title: "跨平台同配置价格快照",
        occurredAt: "2026-05-28T09:30:00Z",
        infoType: "price",
        content: {
          price: 4288,
          currency: "CNY",
          spec: "16G+512G",
          symbol: "surface-pro-8",
          url: "https://www.goofish.com/",
        },
      },
    ];

    return {
      history: [
        { at: "2026-05-28T09:30:00Z", label: "首个价格样本已入库" },
        { at: "2026-05-31T09:30:00Z", label: "同配置价格继续下探" },
        { at: "2026-06-01T09:31:00Z", label: "触发 30 天新低事件" },
      ],
      breakdown: null,
      timeline: [
        {
          id: `${theme.id}-timeline-run-1`,
          kind: "run",
          at: "2026-06-01T09:30:00Z",
          title: "最新抓取完成",
          summary: "已完成跨平台同配置价格采集与去重。",
          meta: { status: "completed", triggerType: "manual", sourceName: "Xianyu Search Results" },
        },
        {
          id: `${theme.id}-timeline-change-1`,
          kind: "change",
          at: "2026-06-01T09:31:00Z",
          title: "价格下探到新低区间",
          summary: "最新样本价格低于近 30 天同配置记录。",
          meta: {
            sourceName: "Xianyu Search Results",
            details: { title: "3999 CNY", logical_key: "surface-pro-8-16g-512g" },
          },
        },
        {
          id: `${theme.id}-timeline-event-1`,
          kind: "event",
          at: "2026-06-01T09:31:00Z",
          title: events[0]?.title ?? "30-day low detected",
          summary: events[0]?.summary ?? "A new low price event was emitted.",
          meta: {
            signal: events[0]?.signal ?? "30d_low",
            eventType: events[0]?.eventType ?? "price_low",
            sourceName: "Xianyu Search Results",
          },
        },
      ],
      records,
    };
  }

  if (theme.type === "content_update") {
    const records: ThemeRecord[] = [
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

    return {
      history: [
        { at: "2026-05-29T07:30:00Z", label: "检测到一轮修复类更新" },
        { at: "2026-05-31T07:30:00Z", label: "新增营销活动类更新卡片" },
        { at: "2026-06-01T07:35:00Z", label: "检测到新的功能发布更新" },
      ],
      breakdown: {
        title: "更新类型分布",
        description: "按最近抓到的内容更新类型聚合，帮助你快速判断当前是功能发布、营销动作还是修复类更新。",
        items: [
          { label: "功能发布", count: 1 },
          { label: "营销活动", count: 1 },
          { label: "修复更新", count: 1 },
        ],
      },
      timeline: [
        {
          id: `${theme.id}-timeline-run-1`,
          kind: "run",
          at: "2026-06-01T07:30:00Z",
          title: "最新抓取完成",
          summary: "已完成 release notes 页面抓取与列表标准化。",
          meta: { status: "completed", triggerType: "schedule", sourceName: "Figma Release Notes" },
        },
        {
          id: `${theme.id}-timeline-change-1`,
          kind: "change",
          at: "2026-06-01T07:34:00Z",
          title: "发现新的更新卡片",
          summary: "列表顶部出现新的 dev mode 更新项。",
          meta: {
            sourceName: "Figma Release Notes",
            details: { title: "Dev mode improvements", logical_key: "figma-dev-mode-update-20260601" },
          },
        },
        {
          id: `${theme.id}-timeline-event-1`,
          kind: "event",
          at: "2026-06-01T07:35:00Z",
          title: events[0]?.title ?? "Figma released a new update",
          summary: events[0]?.summary ?? "A new content update event was emitted.",
          meta: {
            signal: events[0]?.signal ?? "content_update",
            eventType: events[0]?.eventType ?? "content_update",
            sourceName: "Figma Release Notes",
          },
        },
      ],
      records,
    };
  }

  if (theme.type === "financial_event") {
    const records: ThemeRecord[] = [
      {
        id: `${theme.id}-record-3`,
        sourceId: "source-pbc-open-market-history",
        sourceName: "PBOC Open Market History",
        title: "公开市场操作结构化记录",
        occurredAt: "2026-06-01T06:10:00Z",
        infoType: "financial_event",
        content: {
          direction_label: "liquidity_withdrawal",
          announcement_no: "[2026]第91号",
          operation_type: "逆回购",
          amount_billion_cny: 420,
          term_days: 7,
          rate_percent: 1.4,
          bidding_method: "固定利率、数量招标",
          direction_reason: "净回笼规模大于投放，短期流动性信号偏收紧。",
        },
      },
      {
        id: `${theme.id}-record-2`,
        sourceId: "source-pbc-open-market",
        sourceName: "PBOC Open Market Announcements",
        title: "公开市场操作结构化记录",
        occurredAt: "2026-05-31T23:00:00Z",
        infoType: "financial_event",
        content: {
          direction_label: "liquidity_injection",
          announcement_no: "[2026]第88号",
          operation_type: "逆回购",
          amount_billion_cny: 980,
          term_days: 7,
          rate_percent: 1.4,
          bidding_method: "固定利率、数量招标",
          direction_reason: "净投放规模放大，短期流动性信号偏宽松。",
        },
      },
      {
        id: `${theme.id}-record-1`,
        sourceId: "source-pbc-open-market",
        sourceName: "PBOC Open Market Announcements",
        title: "公开市场操作结构化记录",
        occurredAt: "2026-05-29T23:00:00Z",
        infoType: "financial_event",
        content: {
          direction_label: "neutral",
          announcement_no: "[2026]第84号",
          operation_type: "逆回购",
          amount_billion_cny: 320,
          term_days: 7,
          rate_percent: 1.5,
          bidding_method: "固定数量、利率招标",
          direction_reason: "当日投放和到期规模接近，整体偏中性。",
        },
      },
    ];

    return {
      history: [
        { at: "2026-05-29T23:00:00Z", label: "公开市场操作记录已入库" },
        { at: "2026-05-31T23:00:00Z", label: "本轮操作方向转向偏宽松" },
        { at: "2026-06-01T06:10:00Z", label: "本轮操作方向转向偏收紧" },
        { at: "2026-06-01T06:00:00Z", label: "最新来源抓取失败，等待复核" },
      ],
      breakdown: {
        title: "方向分布",
        description: "按结构化金融事件的方向标签聚合，帮助你快速判断近期流动性倾向。",
        items: [
          { label: "流动性回笼", count: 1 },
          { label: "流动性投放", count: 1 },
          { label: "中性", count: 1 },
        ],
      },
      timeline: [
        {
          id: `${theme.id}-timeline-run-1`,
          kind: "run",
          at: "2026-06-01T06:00:00Z",
          title: "最新抓取失败",
          summary: "来源抓取完成但解析失败，等待复核页面结构变化。",
          meta: { status: "failed", triggerType: "schedule", sourceName: "PBOC Open Market Announcements" },
        },
        {
          id: `${theme.id}-timeline-change-1`,
          kind: "change",
          at: "2026-05-31T23:01:00Z",
          title: "本轮净投放规模扩大",
          summary: "与上一轮相比，金额和方向标签都发生变化。",
          meta: {
            sourceName: "PBOC Open Market Announcements",
            details: { title: "[2026]第88号", logical_key: "pbc-omo-20260531-88" },
          },
        },
        {
          id: `${theme.id}-timeline-event-1`,
          kind: "event",
          at: "2026-06-01T06:10:00Z",
          title: events[0]?.title ?? "Liquidity withdrawal signal recorded",
          summary: events[0]?.summary ?? "A new financial event was emitted.",
          meta: {
            signal: events[0]?.signal ?? "liquidity_withdrawal",
            eventType: events[0]?.eventType ?? "new_financial_event",
            sourceName: "PBOC Open Market History",
          },
        },
      ],
      records,
    };
  }

  if (theme.type === "news_announcement") {
    const records: ThemeRecord[] = [
      {
        id: `${theme.id}-record-1`,
        sourceId: "source-stats-cpi-release",
        sourceName: "NBS CPI Release List",
        title: "国家统计局 CPI 发布",
        occurredAt: "2026-06-01T08:02:00Z",
        infoType: "news_announcement",
        content: {
          release_topic_label: "CPI",
          publisher: "国家统计局",
          category: "macro_release",
          description: "Latest CPI bulletin and attached statistical interpretation.",
        },
      },
    ];

    return {
      history: [
        { at: "2026-06-01T08:02:00Z", label: "最新 CPI 发布已入库" },
      ],
      breakdown: {
        title: "发布主题分布",
        description: "按最近抓到的官方发布主题聚合，帮助你快速判断当前宏观关注点。",
        items: [
          { label: "CPI", count: 1 },
        ],
      },
      timeline: [
        {
          id: `${theme.id}-timeline-run-1`,
          kind: "run",
          at: "2026-06-01T08:05:00Z",
          title: "最新抓取完成",
          summary: "已完成统计局发布列表抓取与结构化。",
          meta: { status: "completed", triggerType: "schedule", sourceName: "NBS CPI Release List" },
        },
        {
          id: `${theme.id}-timeline-event-1`,
          kind: "event",
          at: "2026-06-01T08:02:00Z",
          title: events[0]?.title ?? "NBS published latest CPI release",
          summary: events[0]?.summary ?? "A new announcement event was emitted.",
          meta: {
            signal: events[0]?.signal ?? "new_announcement",
            eventType: events[0]?.eventType ?? "new_release",
            sourceName: "NBS CPI Release List",
          },
        },
      ],
      records,
    };
  }

  return {
    history: [],
    breakdown: null,
    timeline: [],
    records: [],
  };
}

async function requestJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

async function requestJsonStrict<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`请求失败 (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function fetchDashboard() {
  const now = Date.now();
  const recentThreshold = now - 24 * 60 * 60 * 1000;

  return requestJson("/dashboard", {
    summary: {
      activeThemes: fallbackThemes.length,
      openEvents: fallbackEvents.filter((event) => (event.status ?? "open") === "open").length,
      trackingEvents: fallbackEvents.filter((event) => event.status === "tracking").length,
      unreadEvents: fallbackEvents.filter((event) => !event.isRead).length,
      bookmarkedEvents: fallbackEvents.filter((event) => Boolean(event.isBookmarked)).length,
      recentEvents: fallbackEvents.filter((event) => new Date(event.occurredAt).getTime() >= recentThreshold).length,
      warningSources: fallbackSources.filter((source) => source.status === "warning").length,
      pendingSources: fallbackSources.filter((source) => source.status === "pending").length,
    },
    events: fallbackEvents,
    bookmarkedEvents: fallbackEvents.filter((event) => event.isBookmarked),
    sectionCounts: {
      "price-signals": {
        total: fallbackEvents.filter((event) => event.infoType === "price").length,
        recent: fallbackEvents.filter((event) => event.infoType === "price" && new Date(event.occurredAt).getTime() >= recentThreshold).length,
      },
      "content-updates": {
        total: fallbackEvents.filter((event) => event.infoType === "content_update").length,
        recent: fallbackEvents.filter((event) => event.infoType === "content_update" && new Date(event.occurredAt).getTime() >= recentThreshold).length,
      },
      "official-releases": {
        total: fallbackEvents.filter((event) => event.signal === "new_announcement").length,
        recent: fallbackEvents.filter((event) => event.signal === "new_announcement" && new Date(event.occurredAt).getTime() >= recentThreshold).length,
      },
      "financial-events": {
        total: fallbackEvents.filter((event) => event.infoType === "financial_event").length,
        recent: fallbackEvents.filter((event) => event.infoType === "financial_event" && new Date(event.occurredAt).getTime() >= recentThreshold).length,
      },
    },
    themes: fallbackThemes.map((theme) => ({
      ...theme,
      reviewStatus: null as string | null,
      reviewTags: [] as string[],
      nextReviewDate: null as string | null,
    })),
    sources: fallbackSources,
  });
}

export async function fetchThemes() {
  const fallbackThemeSummaries = fallbackThemes.map((theme) => {
    const themeEvents = fallbackEvents.filter((event) => event.themeId === theme.id);

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
      reviewStatus: null as string | null,
      reviewTags: [] as string[],
      nextReviewDate: null as string | null,
    };
  });

  return requestJson("/themes", fallbackThemeSummaries);
}

export async function fetchThemeDetail(themeId: string) {
  const theme = fallbackThemes.find((item) => item.id === themeId) ?? fallbackThemes[0];
  const events = fallbackEvents.filter((item) => item.themeId === theme.id);
  const sources = fallbackSources.filter((item) => item.themeId === theme.id);
  const artifacts = buildFallbackThemeArtifacts(theme, events);

  return requestJson<ThemeDetail>(`/themes/${themeId}`, {
    theme,
    events,
    sources,
    history: artifacts.history,
    breakdown: artifacts.breakdown,
    marketOverview: artifacts.marketOverview ?? null,
    timeline: artifacts.timeline,
    records: artifacts.records,
    analysis: buildFallbackThemeAnalysis({
      type: theme.type,
      latestInsight: theme.latestInsight,
      events,
      sources,
      records: artifacts.records,
    }),
  });
}

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

export async function fetchThemeDailyActivity(themeId: string, days: number = 7) {
  const fallback: ThemeDailyActivity = {
    themeId,
    days: [],
    totals: { events: 0, runs: 0, changes: 0 },
  };
  return requestJson<ThemeDailyActivity>(`/themes/${themeId}/daily-activity?days=${days}`, fallback);
}

export async function fetchEventDetail(eventId: string) {
  const event = fallbackEvents.find((item) => item.id === eventId) ?? fallbackEvents[0];

  return requestJson<EventDetail>(`/events/${eventId}`, {
    ...event,
    evidence: [
      "Source run completed successfully.",
      "Standardized price compared against last 30 days of data.",
      "Event emitted after threshold evaluation.",
    ],
    explanation: buildFallbackEventExplanation(event),
  });
}

export async function updateEvent(eventId: string, input: {
  status?: string;
  isRead?: boolean;
  isBookmarked?: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to update event: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    status: string;
    isRead: boolean;
    isBookmarked: boolean;
    bookmarkedAt: string | null;
  };
}

export async function updateEventStatus(eventId: string, status: string) {
  return updateEvent(eventId, { status });
}

// Event Feedback API
export type EventFeedback = "useful" | "noise" | "watch";

export type EventFeedbackRecord = {
  id: string;
  eventId: string;
  feedback: EventFeedback;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchEventFeedback(eventId: string) {
  try {
    return await requestJsonStrict<EventFeedbackRecord>(`/events/${eventId}/feedback`);
  } catch {
    return null;
  }
}

export async function upsertEventFeedback(eventId: string, feedback: EventFeedback, note?: string) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/feedback`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ feedback, note }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update feedback: ${response.status}`);
  }

  return (await response.json()) as EventFeedbackRecord;
}

export async function deleteEventFeedback(eventId: string) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/feedback`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete feedback: ${response.status}`);
  }

  return (await response.json()) as { success: boolean };
}

// Feedback Aggregation API
export type { FeedbackAggregation, FeedbackAggregationItem };

export async function fetchFeedbackAggregation(): Promise<FeedbackAggregation> {
  const fallbackAggregation: FeedbackAggregation = {
    bySignal: [],
    byEventType: [],
    byTheme: [],
    totalFeedback: 0,
    recentFeedback: 0,
  };

  return requestJson<FeedbackAggregation>("/events/feedback/stats", fallbackAggregation);
}

export async function fetchInboxSectionEvents(sectionId: string) {
  const filteredFallback = fallbackEvents.filter((event) => {
    if (sectionId === "price-signals") {
      return event.infoType === "price";
    }

    if (sectionId === "content-updates") {
      return event.infoType === "content_update";
    }

    if (sectionId === "official-releases") {
      return event.signal === "new_announcement";
    }

    if (sectionId === "financial-events") {
      return event.infoType === "financial_event";
    }

    return false;
  });

  return requestJson(`/inbox/sections/${sectionId}/events`, filteredFallback);
}

export async function fetchEvents() {
  return requestJson("/events", fallbackEvents);
}

export async function fetchSourceStatuses() {
  return requestJson("/sources/status", fallbackSources);
}

export async function fetchSourceDetail(sourceId: string) {
  const source = fallbackSources.find((item) => item.id === sourceId) ?? fallbackSources[0];
  const events = fallbackEvents
    .filter((item) => item.themeId === source.themeId)
    .map((item) => ({
      id: item.id,
      title: item.title,
      signal: item.signal,
      status: item.status,
      isRead: item.isRead,
      isBookmarked: item.isBookmarked,
      occurredAt: item.occurredAt,
      summary: item.summary,
    }));

  return requestJson<SourceDetail>(`/sources/${sourceId}`, {
    source: {
      ...source,
      config: {},
    },
    runs: [
      {
        id: `run-${source.id}-latest`,
        status: source.latestRunStatus ?? "completed",
        triggerType: "manual",
        startedAt: source.latestRunAt,
        finishedAt: source.latestRunAt,
        errorMessage: source.lastErrorMessage ?? null,
        snapshotCount: 0,
        recordCount: 0,
        changeCount: 0,
        eventCount: events.length,
      },
    ],
    events,
    records: [],
    changes: [],
    snapshots: [
      {
        id: `snapshot-${source.id}-latest`,
        sourceRunId: `run-${source.id}-latest`,
        fetchedAt: source.latestRunAt ?? source.latestSuccessAt,
        storagePath: null,
        payloadPreview: JSON.stringify(
          [
            {
              title: source.name,
              fetched_from: source.themeName,
              status: source.status,
            },
          ],
          null,
          2,
        ),
      },
    ],
    analysis: {
      tone: source.status === "warning" ? "warning" : source.isPaused ? "pending" : "healthy",
      toneLabel: source.status === "warning" ? "需要优先处理" : source.isPaused ? "当前已暂停" : "整体稳定",
      headline:
        source.status === "warning"
          ? "当前来源存在异常，建议优先处理。"
          : source.isPaused
            ? "当前来源处于暂停状态。"
            : "当前来源运行稳定。",
      summary: source.lastErrorMessage ?? "可以继续结合最近运行历史和事件输出判断这个来源的可靠性。",
      keyPoints: [
        `最近运行状态：${source.latestRunStatus ?? "暂无"}`,
        `相关主题：${source.themeName}`,
      ],
      risks: [
        source.status === "warning" ? "如果不处理，主题判断可能漏掉最新变化。" : "当前未发现明显风险。",
      ],
      actions: [
        source.status === "warning" ? "优先查看最近错误信息并补跑验证。" : "继续观察其输出质量，必要时手动补跑。",
      ],
    },
  });
}

export async function fetchSourcePresets() {
  const fallback: Array<{
    id: string;
    label: string;
    description: string;
    sourceType: string;
    adapterKey: string;
    infoType: string;
    fields: Array<{ key: string; label: string; type: string; placeholder?: string; required?: boolean }>;
    defaultConfig: Record<string, string | number | boolean>;
    help?: string;
  }> = [];
  return requestJson("/sources/presets", fallback);
}

export async function validateSourceConfig(input: {
  presetId?: string;
  adapterKey?: string;
  sourceType?: string;
  config?: Record<string, unknown>;
  name?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/sources/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Validation request failed: ${response.status}`);
  }

  return (await response.json()) as {
    valid: boolean;
    errors: string[];
    warnings: string[];
    presetId?: string;
  };
}

export async function createSource(input: {
  themeId: string;
  name: string;
  sourceType: string;
  adapterKey: string;
  config?: Record<string, unknown>;
  onboardingStatus?: "draft" | "ready_to_test" | "active";
}) {
  const response = await fetch(`${API_BASE_URL}/sources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create source: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    onboardingStatus?: string;
  };
}

export async function triggerSourceRun(sourceId: string) {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/runs`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to trigger source run: ${response.status}`);
  }

  return (await response.json()) as { queued: boolean; mode: string };
}

export async function retrySourceAfterFailure(sourceId: string, failedRunId: string) {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/runs/${failedRunId}/retry`, {
    method: "POST",
  });

  if (response.status === 409) {
    const body = await response.json() as { rejected?: boolean; reason?: string };
    throw new Error(body.reason ?? "Run is not in failed state");
  }

  if (!response.ok) {
    throw new Error(`Failed to retry: ${response.status}`);
  }

  return (await response.json()) as { queued: boolean; mode: string; runId: string; triggeredBy: string };
}

export async function triggerTestSourceRun(sourceId: string) {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/test-run`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to trigger test run: ${response.status}`);
  }

  return (await response.json()) as { queued: boolean; mode: string; triggerType: string; runId: string };
}

export async function triggerSourceReplay(sourceId: string, snapshotId: string) {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/replay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshotId }),
  });

  if (response.status === 409) {
    const body = await response.json() as { rejected?: boolean; reason?: string };
    throw new Error(body.reason ?? "Snapshot not found for this source");
  }

  if (!response.ok) {
    throw new Error(`Failed to trigger replay: ${response.status}`);
  }

  return (await response.json()) as { queued: boolean; mode: string; triggerType: string; runId: string; snapshotId: string };
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

export async function fetchSourceReplayComparison(sourceId: string, runId: string) {
  const response = await requestJson<SourceReplayComparison | null>(
    `/sources/${sourceId}/runs/${runId}/comparison`,
    null,
  );
  return response;
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

export async function fetchSourceTestPreview(sourceId: string) {
  const fallback: SourceTestRunPreview | null = null;
  return requestJson<SourceTestRunPreview | null>(`/sources/${sourceId}/test-preview`, fallback);
}

export async function updateSourcePaused(sourceId: string, isPaused: boolean) {
  return updateSource({ sourceId, isPaused });
}

export async function updateSource(input: {
  sourceId: string;
  name?: string;
  sourceType?: string;
  adapterKey?: string;
  config?: Record<string, unknown>;
  isPaused?: boolean;
  onboardingStatus?: "draft" | "ready_to_test" | "active";
}) {
  const response = await fetch(`${API_BASE_URL}/sources/${input.sourceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      sourceType: input.sourceType,
      adapterKey: input.adapterKey,
      config: input.config,
      isPaused: input.isPaused,
      onboardingStatus: input.onboardingStatus,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update source: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    isPaused: boolean;
    onboardingStatus?: string;
    mode: string;
  };
}

export async function deleteSource(sourceId: string) {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete source: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
  };
}

export async function createTheme(input: {
  name: string;
  themeType: string;
  infoType: string;
  description?: string;
  runImmediately?: boolean;
  sources?: Array<{
    name: string;
    sourceType: string;
    adapterKey: string;
    config?: Record<string, unknown>;
  }>;
}) {
  const response = await fetch(`${API_BASE_URL}/themes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create theme: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    sourceIds: string[];
    queuedSourceIds: string[];
  };
}

export async function updateTheme(input: {
  themeId: string;
  name?: string;
  description?: string | null;
  status?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/themes/${input.themeId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      status: input.status,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update theme: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
  };
}

export async function deleteTheme(themeId: string) {
  const response = await fetch(`${API_BASE_URL}/themes/${themeId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete theme: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
  };
}

// Theme Review Notes API
export type ThemeReviewNote = {
  content: string;
  updatedAt: string | null;
  status?: "pending_review" | "reviewed" | "tracking";
  tags?: string[];
  nextReviewDate?: string | null;
};

export async function fetchThemeReviewNote(themeId: string) {
  return requestJsonStrict<ThemeReviewNote>(`/themes/${themeId}/review-note`);
}

export async function updateThemeReviewNote(
  themeId: string,
  content: string,
  status?: "pending_review" | "reviewed" | "tracking",
  tags?: string[],
  nextReviewDate?: string | null,
) {
  const response = await fetch(`${API_BASE_URL}/themes/${themeId}/review-note`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, status, tags, nextReviewDate }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update review note: ${response.status}`);
  }

  return (await response.json()) as ThemeReviewNote;
}

export type PaginatedNotifications = {
  items: NotificationItem[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
};

export async function fetchNotifications(options?: {
  status?: string;
  limit?: number;
  cursor?: string;
  offset?: number;
  signal?: string;
  level?: "high" | "medium" | "low";
  themeId?: string;
  onlyUnreadEvents?: boolean;
  sortBy?: "createdAt" | "sentAt";
  sortOrder?: "asc" | "desc";
}): Promise<PaginatedNotifications> {
  const params = new URLSearchParams();

  if (options?.status) {
    params.set("status", options.status);
  }

  if (options?.limit) {
    params.set("limit", String(options.limit));
  }

  if (options?.cursor) {
    params.set("cursor", options.cursor);
  }

  if (options?.offset !== undefined) {
    params.set("offset", String(options.offset));
  }

  if (options?.signal) {
    params.set("signal", options.signal);
  }

  if (options?.level) {
    params.set("level", options.level);
  }

  if (options?.themeId) {
    params.set("themeId", options.themeId);
  }

  if (options?.onlyUnreadEvents) {
    params.set("onlyUnreadEvents", "true");
  }

  if (options?.sortBy) {
    params.set("sortBy", options.sortBy);
  }

  if (options?.sortOrder) {
    params.set("sortOrder", options.sortOrder);
  }

  const query = params.toString();
  const path = query ? `/notifications?${query}` : "/notifications";

  return requestJsonStrict<PaginatedNotifications>(path);
}

export async function markNotificationRead(notificationId: string) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "sent" }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update notification: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    status: string;
  };
}

export async function batchMarkNotificationsRead(notificationIds: string[]) {
  const response = await fetch(`${API_BASE_URL}/notifications/batch/read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: notificationIds }),
  });

  if (!response.ok) {
    throw new Error(`Failed to batch mark notifications: ${response.status}`);
  }

  return (await response.json()) as { updated: number };
}

export async function batchDeleteNotifications(filter: {
  status?: string;
  channel?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/notifications/batch/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filter),
  });

  if (!response.ok) {
    throw new Error(`Failed to batch delete notifications: ${response.status}`);
  }

  return (await response.json()) as { deleted: number };
}

export async function clearUnreadByTheme(themeId: string) {
  const response = await fetch(`${API_BASE_URL}/notifications/batch/clear-unread/${themeId}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to clear unread: ${response.status}`);
  }

  return (await response.json()) as { updated: number };
}

export async function retryFailedNotification(notificationId: string) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/retry`, {
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Failed to retry: ${response.status}`);
  }

  return (await response.json()) as { success: boolean; message: string };
}

export type NotificationStats = {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  failureRate: number;
  recentFailures: Array<{
    id: string;
    eventId: string;
    channel: string;
    createdAt: string;
  }>;
};

export async function fetchNotificationStats() {
  return requestJsonStrict<NotificationStats>("/notifications/stats");
}

// Notification Audit API
export type AuditLogEntry = {
  id: string;
  notificationId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function fetchAuditLogs(options?: {
  notificationId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();

  if (options?.notificationId) {
    params.set("notificationId", options.notificationId);
  }

  if (options?.action) {
    params.set("action", options.action);
  }

  if (options?.limit) {
    params.set("limit", String(options.limit));
  }

  if (options?.offset !== undefined) {
    params.set("offset", String(options.offset));
  }

  const query = params.toString();
  const path = query ? `/notification-audit?${query}` : "/notification-audit";

  return requestJsonStrict<{ items: AuditLogEntry[]; total: number }>(path);
}

export async function fetchNotificationTimeline(notificationId: string) {
  return requestJsonStrict<AuditLogEntry[]>(`/notification-audit/${notificationId}/timeline`);
}

// Channel Config API
export async function saveChannelConfigToBackend(channel: string, config: ChannelConfig) {
  const response = await fetch(`${API_BASE_URL}/channels/${channel}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save channel config: ${response.status}`);
  }

  return (await response.json()) as { channel: string; saved: boolean };
}

export async function loadChannelConfigFromBackend(channel: string): Promise<ChannelConfig | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/channels/${channel}/config`);
    if (!response.ok) return null;
    const data = await response.json() as { channel: string; config: ChannelConfig };
    return data.config;
  } catch {
    return null;
  }
}

// Source Health API
export type SourceHealthStats = {
  totalSources: number;
  healthySources: number;
  warningSources: number;
  pausedSources: number;
  healthRate: number;
  recentRuns: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  averageRunDuration: number | null;
  recentErrors: Array<{
    sourceId: string;
    sourceName: string;
    errorMessage: string;
    occurredAt: string;
  }>;
  sourceDetails: Array<{
    id: string;
    name: string;
    themeName: string;
    status: string;
    isPaused: boolean;
    latestRunStatus: string | null;
    latestRunAt: string | null;
    latestSuccessAt: string | null;
    latestFailureAt: string | null;
    lastErrorMessage: string | null;
    runCount24h: number;
    successCount24h: number;
    failureCount24h: number;
  }>;
};

export async function fetchSourceHealthStats() {
  return requestJsonStrict<SourceHealthStats>("/sources/health");
}

// Source Health Explanation API
export type SourceHealthExplanation = {
  sourceId: string;
  sourceName: string;
  status: "healthy" | "warning" | "paused";
  healthScore: number;
  breakdown: {
    freshness: number;
    stability: number;
    completeness: number;
    timeliness: number;
  };
  issue: string | null;
  impact: string | null;
  impactLevel: "none" | "low" | "medium" | "high";
  recommendation: string | null;
  issues: Array<{
    type: "fetch_failed" | "long_stale" | "paused" | "pending_backlog" | "error_message" | "record_drop" | "silent_degradation" | "upstream_unreachable" | "upstream_empty" | "parse_mismatch" | "normalized_zero" | "rule_produced_nothing";
    label: string;
    description: string;
    impact: string;
  }>;
};

export async function fetchSourceHealthExplanation(sourceId: string) {
  return requestJsonStrict<SourceHealthExplanation>(`/sources/${sourceId}/health-explanation`);
}

export async function fetchAllSourceHealthExplanations() {
  return requestJsonStrict<SourceHealthExplanation[]>("/sources/health-explanations");
}

// Notification Preferences API
export async function fetchNotificationPreferences() {
  return requestJson<NotificationPreference[]>("/notification-preferences", []);
}

export async function createNotificationPreference(input: NotificationPreferenceInput) {
  const response = await fetch(`${API_BASE_URL}/notification-preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create preference: ${response.status}`);
  }

  return (await response.json()) as NotificationPreference;
}

export async function updateNotificationPreference(
  preferenceId: string,
  input: Partial<NotificationPreferenceInput>,
) {
  const response = await fetch(`${API_BASE_URL}/notification-preferences/${preferenceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to update preference: ${response.status}`);
  }

  return (await response.json()) as NotificationPreference;
}

export async function deleteNotificationPreference(preferenceId: string) {
  const response = await fetch(`${API_BASE_URL}/notification-preferences/${preferenceId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete preference: ${response.status}`);
  }

  return (await response.json()) as { success: boolean };
}

// Rule Configuration API
export async function fetchRuleConfigurations(options?: {
  themeId?: string;
  ruleKey?: string;
}) {
  const params = new URLSearchParams();

  if (options?.themeId) {
    params.set("themeId", options.themeId);
  }

  if (options?.ruleKey) {
    params.set("ruleKey", options.ruleKey);
  }

  const query = params.toString();
  const path = query ? `/rule-configurations?${query}` : "/rule-configurations";

  return requestJson<RuleConfiguration[]>(path, []);
}

export async function createRuleConfiguration(input: RuleConfigurationInput) {
  const response = await fetch(`${API_BASE_URL}/rule-configurations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create rule configuration: ${response.status}`);
  }

  return (await response.json()) as RuleConfiguration;
}

export async function updateRuleConfiguration(
  configId: string,
  input: Partial<RuleConfigurationInput>,
) {
  const response = await fetch(`${API_BASE_URL}/rule-configurations/${configId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to update rule configuration: ${response.status}`);
  }

  return (await response.json()) as RuleConfiguration;
}

export async function deleteRuleConfiguration(configId: string) {
  const response = await fetch(`${API_BASE_URL}/rule-configurations/${configId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete rule configuration: ${response.status}`);
  }

  return (await response.json()) as { success: boolean };
}

// Daily Summary API
export type { DailySummary, DailySummaryItem };

export async function fetchDailySummary(): Promise<DailySummary> {
  const fallbackSummary: DailySummary = {
    generatedAt: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    items: [
      {
        category: "price-signals",
        label: "Price Signals",
        count: fallbackEvents.filter((e) => e.infoType === "price").length,
        recentCount: fallbackEvents.filter((e) => e.infoType === "price" && new Date(e.occurredAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000).length,
        latestEvent: fallbackEvents.find((e) => e.infoType === "price")
          ? {
              id: fallbackEvents.find((e) => e.infoType === "price")!.id,
              title: fallbackEvents.find((e) => e.infoType === "price")!.title,
              signal: fallbackEvents.find((e) => e.infoType === "price")!.signal,
              occurredAt: fallbackEvents.find((e) => e.infoType === "price")!.occurredAt,
              themeId: fallbackEvents.find((e) => e.infoType === "price")!.themeId,
              themeName: fallbackEvents.find((e) => e.infoType === "price")!.themeName,
            }
          : null,
      },
      {
        category: "financial-events",
        label: "Financial Events",
        count: fallbackEvents.filter((e) => e.infoType === "financial_event").length,
        recentCount: fallbackEvents.filter((e) => e.infoType === "financial_event" && new Date(e.occurredAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000).length,
        latestEvent: fallbackEvents.find((e) => e.infoType === "financial_event")
          ? {
              id: fallbackEvents.find((e) => e.infoType === "financial_event")!.id,
              title: fallbackEvents.find((e) => e.infoType === "financial_event")!.title,
              signal: fallbackEvents.find((e) => e.infoType === "financial_event")!.signal,
              occurredAt: fallbackEvents.find((e) => e.infoType === "financial_event")!.occurredAt,
              themeId: fallbackEvents.find((e) => e.infoType === "financial_event")!.themeId,
              themeName: fallbackEvents.find((e) => e.infoType === "financial_event")!.themeName,
            }
          : null,
      },
      {
        category: "official-releases",
        label: "Official Releases",
        count: fallbackEvents.filter((e) => e.signal === "new_announcement").length,
        recentCount: fallbackEvents.filter((e) => e.signal === "new_announcement" && new Date(e.occurredAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000).length,
        latestEvent: fallbackEvents.find((e) => e.signal === "new_announcement")
          ? {
              id: fallbackEvents.find((e) => e.signal === "new_announcement")!.id,
              title: fallbackEvents.find((e) => e.signal === "new_announcement")!.title,
              signal: fallbackEvents.find((e) => e.signal === "new_announcement")!.signal,
              occurredAt: fallbackEvents.find((e) => e.signal === "new_announcement")!.occurredAt,
              themeId: fallbackEvents.find((e) => e.signal === "new_announcement")!.themeId,
              themeName: fallbackEvents.find((e) => e.signal === "new_announcement")!.themeName,
            }
          : null,
      },
      {
        category: "content-updates",
        label: "Content Updates",
        count: fallbackEvents.filter((e) => e.infoType === "content_update").length,
        recentCount: fallbackEvents.filter((e) => e.infoType === "content_update" && new Date(e.occurredAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000).length,
        latestEvent: fallbackEvents.find((e) => e.infoType === "content_update")
          ? {
              id: fallbackEvents.find((e) => e.infoType === "content_update")!.id,
              title: fallbackEvents.find((e) => e.infoType === "content_update")!.title,
              signal: fallbackEvents.find((e) => e.infoType === "content_update")!.signal,
              occurredAt: fallbackEvents.find((e) => e.infoType === "content_update")!.occurredAt,
              themeId: fallbackEvents.find((e) => e.infoType === "content_update")!.themeId,
              themeName: fallbackEvents.find((e) => e.infoType === "content_update")!.themeName,
            }
          : null,
      },
    ],
    warningSources: fallbackSources
      .filter((s) => s.status === "warning")
      .map((s) => ({
        id: s.id,
        name: s.name,
        themeName: s.themeName,
        status: s.status,
        lastErrorMessage: s.lastErrorMessage ?? null,
      })),
    totalEvents: fallbackEvents.length,
    recentEvents: fallbackEvents.filter((e) => new Date(e.occurredAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000).length,
  };

  return requestJson<DailySummary>("/daily-summary", fallbackSummary);
}

export type ChannelConfig = {
  webhook?: { url: string; headers?: Record<string, string> };
  telegram?: { botToken: string; chatId: string };
};

export async function deliverDailySummary(
  channel: string = "in_app",
  channelConfig?: ChannelConfig,
): Promise<{ delivered: boolean; notificationId?: string }> {
  const response = await fetch(`${API_BASE_URL}/daily-summary/deliver`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, channelConfig }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? `Failed to deliver daily summary: ${response.status}`);
  }

  return (await response.json()) as { delivered: boolean; notificationId?: string };
}

// Daily Summary History API
export type DailySummarySnapshot = {
  id: string;
  date: string;
  summary: DailySummary;
  createdAt: string;
};

export async function fetchDailySummaryHistory(limit: number = 7): Promise<DailySummarySnapshot[]> {
  const fallback: DailySummarySnapshot[] = [];
  return requestJson(`/daily-summary/history?limit=${limit}`, fallback);
}

export type DailySummaryCompare = {
  today: DailySummary;
  yesterday: DailySummary | null;
  delta: {
    totalEvents: number;
    recentEvents: number;
    newWarningSources: number;
  } | null;
};

export async function fetchDailySummaryCompare(): Promise<DailySummaryCompare> {
  const today = await fetchDailySummary();
  const fallback: DailySummaryCompare = { today, yesterday: null, delta: null };
  return requestJson("/daily-summary/compare", fallback);
}

// Daily Summary Subscription Config API
export type DailySummaryConfig = {
  enabled: boolean;
  channel: string;
  deliveryTime: string;
};

export async function fetchDailySummaryConfig(): Promise<DailySummaryConfig> {
  const fallback: DailySummaryConfig = { enabled: false, channel: "in_app", deliveryTime: "09:00" };
  return requestJson("/daily-summary/config", fallback);
}

export async function updateDailySummaryConfig(config: DailySummaryConfig): Promise<DailySummaryConfig> {
  const response = await fetch(`${API_BASE_URL}/daily-summary/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`Failed to update daily summary config: ${response.status}`);
  }

  return (await response.json()) as DailySummaryConfig;
}

export type StockMarketCloseReportConfig = {
  enabled: boolean;
  channel: string;
  deliveryTime: string;
};

// ─── Stock Market Close Report ─────────────────────────────────────────────

function buildFallbackStockMarketCloseReport(): StockMarketCloseReport | null {
  const theme = fallbackThemes.find((item) => item.id === "theme-cn-hk-market-overview");
  if (!theme) {
    return null;
  }

  const events = fallbackEvents.filter((item) => item.themeId === theme.id);
  const artifacts = buildFallbackThemeArtifacts(theme, events);
  const detail: ThemeDetail = {
    theme,
    events,
    sources: fallbackSources.filter((item) => item.themeId === theme.id),
    history: artifacts.history,
    breakdown: artifacts.breakdown,
    marketOverview: artifacts.marketOverview ?? null,
    timeline: artifacts.timeline,
    records: artifacts.records,
    analysis: buildFallbackThemeAnalysis({
      type: theme.type,
      latestInsight: theme.latestInsight,
      events,
      sources: fallbackSources.filter((item) => item.themeId === theme.id),
      records: artifacts.records,
    }),
  };

  return buildStockMarketCloseReport(detail);
}

export async function fetchStockMarketCloseReport(): Promise<StockMarketCloseReport | null> {
  const fallback = buildFallbackStockMarketCloseReport();
  return requestJson("/stock-market-report", fallback);
}

export async function fetchStockMarketCloseReportHistory(limit: number = 7): Promise<StockMarketCloseReportSnapshot[]> {
  const fallbackReport = buildFallbackStockMarketCloseReport();
  const fallback: StockMarketCloseReportSnapshot[] = fallbackReport
    ? [
        {
          id: "report-stock-market-fallback",
          workspaceId: "stock-market",
          date: fallbackReport.date,
          report: fallbackReport,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];
  return requestJson(`/stock-market-report/history?limit=${limit}`, fallback);
}

export async function fetchStockMarketCloseReportSnapshotByDate(date: string): Promise<StockMarketCloseReportSnapshot | null> {
  const fallbackHistory = await fetchStockMarketCloseReportHistory(30);
  const fallback = fallbackHistory.find((item) => item.date === date) ?? null;
  return requestJson(`/stock-market-report/by-date?date=${date}`, fallback);
}

export async function saveStockMarketCloseReport(): Promise<StockMarketCloseReportSnapshot> {
  const response = await fetch(`${API_BASE_URL}/stock-market-report/save`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to save stock market close report: ${response.status}`);
  }

  return (await response.json()) as StockMarketCloseReportSnapshot;
}

export async function fetchStockMarketCloseReportConfig(): Promise<StockMarketCloseReportConfig> {
  const fallback: StockMarketCloseReportConfig = { enabled: false, channel: "in_app", deliveryTime: "16:25" };
  return requestJson("/stock-market-report/config", fallback);
}

export async function updateStockMarketCloseReportConfig(config: StockMarketCloseReportConfig): Promise<StockMarketCloseReportConfig> {
  const response = await fetch(`${API_BASE_URL}/stock-market-report/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`Failed to update stock market close report config: ${response.status}`);
  }

  return (await response.json()) as StockMarketCloseReportConfig;
}

// ─── Weekly Summary ─────────────────────────────────────────────────────────

export type WeeklySummary = {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  totalEvents: number;
  recentEvents: number;
  items: Array<{
    category: string;
    label: string;
    count: number;
    recentCount: number;
    dailyTrend: number[];
  }>;
  warningSources: Array<{
    id: string;
    name: string;
    themeName: string;
    status: string;
    lastErrorMessage: string | null;
  }>;
  directionBreakdown?: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  dayLabels: string[];
  dominantCategory?: {
    category: string;
    label: string;
    percentage: number;
  };
  weekOverWeekDelta?: {
    totalEventsDelta: number;
    recentEventsDelta: number;
    trend: "up" | "down" | "flat";
  };
  topChanges?: string[];
  topThemesToFollow?: string[];
};

export type WeeklySummaryCompare = {
  thisWeek: WeeklySummary;
  lastWeek: WeeklySummary | null;
  delta: {
    totalEvents: number;
    recentEvents: number;
    newWarningSources: number;
  } | null;
};

export async function fetchWeeklySummary(): Promise<WeeklySummary> {
  return requestJsonStrict<WeeklySummary>("/weekly-summary");
}

export async function fetchWeeklySummaryCompare(): Promise<WeeklySummaryCompare> {
  return requestJsonStrict<WeeklySummaryCompare>("/weekly-summary/compare");
}

// ─── Weekly Review History & Export (Task 11) ─────────────────────────────────

export type WeeklyReviewHistoryItem = WeeklySummary;

export async function fetchWeeklyReviewHistory(weeks: number = 4): Promise<WeeklyReviewHistoryItem[]> {
  return requestJsonStrict<WeeklyReviewHistoryItem[]>(`/weekly-summary/history?weeks=${weeks}`);
}

export async function fetchWeeklyReviewExport(format: "text" | "json" = "text"): Promise<{ content: string; format: string } | Record<string, unknown>> {
  return requestJsonStrict<{ content: string; format: string } | Record<string, unknown>>(`/weekly-summary/export?format=${format}`);
}

// ─── Price Comparison (Task 4) ────────────────────────────────────────────────

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
  priceGap: number | null;
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

export async function fetchPriceComparison(themeId: string): Promise<PriceComparisonResult> {
  return requestJsonStrict<PriceComparisonResult>(`/themes/${themeId}/price-comparison`);
}

// ─── Source Config History ───────────────────────────────────────────────────

export type SourceConfigVersion = {
  id: string;
  sourceId: string;
  config: Record<string, unknown>;
  version: number;
  createdAt: string;
};

export async function fetchSourceConfigHistory(sourceId: string): Promise<SourceConfigVersion[]> {
  return requestJsonStrict<SourceConfigVersion[]>(`/sources/${sourceId}/config-history`);
}

export async function rollbackSourceConfig(sourceId: string, version: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/config-rollback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  });

  if (!response.ok) {
    throw new Error(`Failed to rollback config: ${response.status}`);
  }

  return (await response.json()) as { success: boolean };
}

// ─── Theme Favorites (DB-backed with localStorage fallback) ──────────────────

const THEME_FAVORITES_KEY = "themeFavorites";

let cachedFavorites: string[] | null = null;

export async function fetchThemeFavorites(): Promise<string[]> {
  try {
    const result = await requestJson<{ favorites: string[] }>(
      "/user-preferences/favorites",
      { favorites: JSON.parse(localStorage.getItem(THEME_FAVORITES_KEY) ?? "[]") },
    );
    cachedFavorites = result.favorites;
    // Sync to localStorage as backup
    localStorage.setItem(THEME_FAVORITES_KEY, JSON.stringify(result.favorites));
    return result.favorites;
  } catch {
    // Fallback to localStorage
    const local = JSON.parse(localStorage.getItem(THEME_FAVORITES_KEY) ?? "[]") as string[];
    cachedFavorites = local;
    return local;
  }
}

export async function setThemeFavorite(themeId: string, favorited: boolean): Promise<void> {
  // Optimistic update
  const favorites = cachedFavorites ?? getThemeFavoritesLocal();
  if (favorited && !favorites.includes(themeId)) {
    favorites.push(themeId);
  } else if (!favorited) {
    const idx = favorites.indexOf(themeId);
    if (idx >= 0) favorites.splice(idx, 1);
  }
  cachedFavorites = favorites;
  localStorage.setItem(THEME_FAVORITES_KEY, JSON.stringify(favorites));

  // Persist to DB
  try {
    await fetch(`${API_BASE_URL}/user-preferences/favorites/${themeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorited }),
    });
  } catch {
    // localStorage already updated, DB sync will happen on next load
  }
}

export function isThemeFavorited(themeId: string): boolean {
  const favorites = cachedFavorites ?? getThemeFavoritesLocal();
  return favorites.includes(themeId);
}

function getThemeFavoritesLocal(): string[] {
  try {
    return JSON.parse(localStorage.getItem(THEME_FAVORITES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

// ─── Saved Filter Views (DB-backed with localStorage fallback) ────────────────

export type SavedFilterView = {
  id: string;
  name: string;
  viewType: "events" | "themes" | "sources";
  filters: Record<string, string>;
  createdAt: string;
};

const SAVED_VIEWS_KEY = "savedFilterViews";

export async function fetchSavedFilterViews(viewType?: string): Promise<SavedFilterView[]> {
  try {
    const params = viewType ? `?viewType=${viewType}` : "";
    const result = await requestJsonStrict<SavedFilterView[]>(
      `/user-preferences/saved-views${params}`,
    );
    // Merge with existing localStorage data to avoid overwriting other viewTypes
    const existing = getSavedFilterViewsLocal();
    if (viewType) {
      // Replace only the matching viewType entries, keep others
      const otherViews = existing.filter((v) => v.viewType !== viewType);
      const merged = [...otherViews, ...result];
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(merged));
    } else {
      // Full replacement when no viewType filter
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(result));
    }
    return result;
  } catch {
    // Fallback to localStorage
    return getSavedFilterViewsLocal();
  }
}

export async function saveFilterView(
  view: Omit<SavedFilterView, "id" | "createdAt">,
): Promise<SavedFilterView> {
  try {
    const response = await fetch(`${API_BASE_URL}/user-preferences/saved-views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(view),
    });
    if (!response.ok) throw new Error(`请求失败 (${response.status})`);
    const result = (await response.json()) as SavedFilterView;
    // Update localStorage
    const views = getSavedFilterViewsLocal();
    views.push(result);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
    return result;
  } catch {
    // Fallback: save locally
    const views = getSavedFilterViewsLocal();
    const newView: SavedFilterView = {
      ...view,
      id: `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    views.push(newView);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
    return newView;
  }
}

export async function deleteFilterView(viewId: string): Promise<void> {
  // Optimistic: remove from localStorage immediately
  const views = getSavedFilterViewsLocal().filter((v) => v.id !== viewId);
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));

  try {
    await fetch(`${API_BASE_URL}/user-preferences/saved-views/${viewId}`, {
      method: "DELETE",
    });
  } catch {
    // localStorage already updated
  }
}

function getSavedFilterViewsLocal(): SavedFilterView[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
