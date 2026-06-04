export type ThemeSummary = {
  id: string;
  name: string;
  type: string;
  status: string;
  latestRunAt: string | null;
  latestEventAt: string | null;
  sourceCount: number;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  sourceHealth?: "healthy" | "warning" | string;
  latestEventTitle?: string | null;
  latestEventSignal?: string | null;
  latestInsight?: string | null;
  openEventCount?: number;
  trackingEventCount?: number;
  ignoredEventCount?: number;
  unreadEventCount?: number;
  bookmarkedEventCount?: number;
};

export type EventSummary = {
  id: string;
  themeId: string;
  themeName: string;
  title: string;
  signal: string;
  status?: string | null;
  isRead?: boolean;
  isBookmarked?: boolean;
  latestStatusChangedAt?: string | null;
  eventType?: string;
  occurredAt: string;
  summary: string;
  infoType?: string | null;
  context?: Record<string, unknown> | null;
};

export type EventDetail = EventSummary & {
  sourceName?: string | null;
  evidence: string[];
  explanation: {
    headline: string;
    impact: string;
    whyItMatters: string[];
    actions: string[];
  };
  statusHistory?: Array<{
    id: string;
    eventId: string;
    fromStatus?: string | null;
    toStatus: string;
    changedAt: string;
  }>;
};

export type SourceStatus = {
  id: string;
  themeId: string;
  themeName: string;
  themeType?: string;
  name: string;
  status: string;
  sourceType?: string;
  adapterKey?: string;
  isPaused?: boolean;
  latestRunStatus?: string | null;
  latestRunAt?: string | null;
  latestSuccessAt: string | null;
  latestFailureAt: string | null;
  lastErrorMessage?: string | null;
};

export type SourceDetail = {
  source: SourceStatus & {
    config?: Record<string, unknown>;
  };
  runs: Array<{
    id: string;
    status: string;
    triggerType: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    errorMessage?: string | null;
  }>;
  events: Array<{
    id: string;
    title: string;
    signal: string;
    status?: string | null;
    isRead?: boolean;
    isBookmarked?: boolean;
    occurredAt: string;
    summary: string;
  }>;
  records: Array<{
    id: string;
    title: string;
    occurredAt: string;
    infoType: string;
    content: Record<string, unknown>;
  }>;
  changes: Array<{
    id: string;
    changeType: string;
    summary: string;
    detectedAt: string;
    details?: Record<string, unknown>;
  }>;
  snapshots: Array<{
    id: string;
    sourceRunId: string;
    fetchedAt: string | null;
    storagePath?: string | null;
    payloadPreview: string;
  }>;
  analysis: {
    tone: "healthy" | "pending" | "warning";
    toneLabel: string;
    headline: string;
    summary: string;
    keyPoints: string[];
    risks: string[];
    actions: string[];
  };
};

export type ThemeRecord = {
  id: string;
  title: string;
  occurredAt: string;
  infoType: string;
  content: Record<string, unknown>;
};

export type ThemeAnalysis = {
  tone: "positive" | "negative" | "neutral";
  headline: string;
  summary: string;
  keyPoints: string[];
  risks: string[];
  actions: string[];
  recentChange: {
    headline: string;
    summary: string;
    highlights: string[];
  };
  trend: {
    headline: string;
    summary: string;
    highlights: string[];
  };
};

export type DashboardSummary = {
  activeThemes: number;
  openEvents: number;
  trackingEvents: number;
  recentEvents: number;
  warningSources: number;
  pendingSources: number;
};

export type InboxSectionCounts = {
  "price-signals": {
    total: number;
    recent: number;
  };
  "official-releases": {
    total: number;
    recent: number;
  };
  "financial-events": {
    total: number;
    recent: number;
  };
};

export type ThemeDetail = {
  theme: {
    id: string;
    name: string;
    type: string;
    infoType?: string;
    description?: string;
    status: string;
    createdAt?: string;
    latestInsight?: string | null;
  };
  sources: Array<{
    id: string;
    name: string;
    status: string;
    sourceType?: string;
    adapterKey?: string;
    config?: Record<string, unknown>;
    isPaused?: boolean;
    latestSuccessAt: string | null;
    latestFailureAt: string | null;
    latestRunStatus?: string | null;
    latestRunAt?: string | null;
  }>;
  events: Array<{
    id: string;
    title: string;
    signal: string;
    status?: string | null;
    isRead?: boolean;
    isBookmarked?: boolean;
    occurredAt: string;
    summary: string;
  }>;
  history: Array<{
    at: string;
    label: string;
  }>;
  breakdown: {
    title: string;
    description: string;
    items: Array<{
      label: string;
      count: number;
    }>;
  } | null;
  timeline: Array<{
    id: string;
    kind: "run" | "change" | "event" | string;
    at: string;
    title: string;
    summary: string;
    meta?: Record<string, unknown>;
  }>;
  records: ThemeRecord[];
  analysis: ThemeAnalysis;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const fallbackThemes: ThemeSummary[] = [
  {
    id: "theme-surface-pro-8",
    name: "Surface Pro 8 16G + 512G Price",
    type: "price",
    status: "active",
    latestRunAt: "2026-06-01T09:30:00Z",
    latestEventAt: "2026-06-01T09:31:00Z",
    sourceCount: 2,
    sourceHealth: "healthy",
    latestEventTitle: "30-day low detected across marketplaces",
    latestEventSignal: "30d_low",
    latestInsight: "3,999 · CNY · 16G+512G",
  },
  {
    id: "theme-macro-gdp-cpi",
    name: "Macro Releases: GDP / CPI",
    type: "financial_event",
    status: "active",
    latestRunAt: "2026-06-01T08:00:00Z",
    latestEventAt: null,
    sourceCount: 3,
    sourceHealth: "warning",
    latestEventTitle: null,
    latestEventSignal: null,
    latestInsight: null,
  },
];

const fallbackEvents: EventSummary[] = [
  {
    id: "event-surface-low",
    themeId: "theme-surface-pro-8",
    themeName: "Surface Pro 8 16G + 512G Price",
    title: "30-day low detected across marketplaces",
    signal: "30d_low",
    status: "open",
    isRead: false,
    isBookmarked: true,
    occurredAt: "2026-06-01T09:31:00Z",
    summary: "A new cross-platform low price was detected for the same configuration.",
  },
  {
    id: "event-rate-cut",
    themeId: "theme-macro-gdp-cpi",
    themeName: "Macro Releases: GDP / CPI",
    title: "Potential bullish macro event recorded",
    signal: "bullish",
    status: "tracking",
    isRead: true,
    isBookmarked: false,
    occurredAt: "2026-05-31T03:00:00Z",
    summary: "A macro release was classified as a potentially bullish event.",
  },
];

const fallbackSources: SourceStatus[] = [
  {
    id: "source-xianyu-surface",
    themeId: "theme-surface-pro-8",
    themeName: "Surface Pro 8 16G + 512G Price",
    name: "Xianyu Search Results",
    status: "healthy",
    latestSuccessAt: "2026-06-01T09:30:00Z",
    latestFailureAt: null,
  },
  {
    id: "source-pbc-policy",
    themeId: "theme-macro-gdp-cpi",
    themeName: "Macro Releases: GDP / CPI",
    name: "PBOC Policy Page",
    status: "warning",
    latestSuccessAt: "2026-05-31T23:00:00Z",
    latestFailureAt: "2026-06-01T06:00:00Z",
  },
];

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

export async function fetchDashboard() {
  return requestJson("/dashboard", {
    summary: {
      activeThemes: 2,
      openEvents: fallbackEvents.filter((event) => (event.status ?? "open") === "open").length,
      trackingEvents: fallbackEvents.filter((event) => event.status === "tracking").length,
      recentEvents: 2,
      warningSources: 1,
      pendingSources: 0,
    },
    events: fallbackEvents,
    bookmarkedEvents: fallbackEvents.filter((event) => event.isBookmarked),
    sectionCounts: {
      "price-signals": {
        total: fallbackEvents.filter((event) => event.infoType === "price").length,
        recent: fallbackEvents.filter((event) => event.infoType === "price").length,
      },
      "official-releases": {
        total: fallbackEvents.filter((event) => event.signal === "new_announcement").length,
        recent: fallbackEvents.filter((event) => event.signal === "new_announcement").length,
      },
      "financial-events": {
        total: fallbackEvents.filter((event) => event.infoType === "financial_event").length,
        recent: fallbackEvents.filter((event) => event.infoType === "financial_event").length,
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
    };
  });

  return requestJson("/themes", fallbackThemeSummaries);
}

export async function fetchThemeDetail(themeId: string) {
  const theme = fallbackThemes.find((item) => item.id === themeId) ?? fallbackThemes[0];
  const events = fallbackEvents.filter((item) => item.themeId === theme.id);
  const sources = fallbackSources.filter((item) => item.themeId === theme.id);

  return requestJson<ThemeDetail>(`/themes/${themeId}`, {
    theme,
    events,
    sources,
    history: [
      { at: "2026-05-30T09:30:00Z", label: "Historical snapshot stored" },
      { at: "2026-05-31T09:30:00Z", label: "Minor price decline detected" },
      { at: "2026-06-01T09:31:00Z", label: "30-day low event emitted" },
    ],
    breakdown: null,
    timeline: [],
    records: [],
    analysis: buildFallbackThemeAnalysis({
      type: theme.type,
      latestInsight: theme.latestInsight,
      events,
      sources,
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
