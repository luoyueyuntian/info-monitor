import type {
  DashboardSummary,
  EventDetail,
  EventSummary,
  InboxSectionCounts,
  NotificationItem,
  NotificationPreference,
  NotificationPreferenceInput,
  RuleConfiguration,
  RuleConfigurationInput,
  SourceDetail,
  SourceStatus,
  ThemeAnalysis,
  ThemeDetail,
  ThemeRecord,
  ThemeSummary,
} from "@info-monitor/shared-contracts";

import { fallbackEvents, fallbackNotifications, fallbackSources, fallbackThemes } from "./demo-fixtures";

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
  SourceDetail,
  SourceStatus,
  ThemeAnalysis,
  ThemeDetail,
  ThemeRecord,
  ThemeSummary,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

function buildFallbackEventExplanation(event: EventSummary) {
  if (event.infoType === "price") {
    return {
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
    } satisfies ThemeAnalysis;
  }

  if (input.type === "financial_event") {
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
    } satisfies ThemeAnalysis;
  }

  return {
    tone: latestEvent ? "neutral" : "neutral",
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
    themes: fallbackThemes,
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

export async function createSource(input: {
  themeId: string;
  name: string;
  sourceType: string;
  adapterKey: string;
  config?: Record<string, unknown>;
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
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update source: ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    isPaused: boolean;
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
