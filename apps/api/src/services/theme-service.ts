import { sql, type Kysely } from "kysely";

import { getDatabase } from "../db/client.js";
import type { Database } from "../db/schema.js";
import { createId } from "../lib/ids.js";
import { mockEvents, mockSources, mockThemes } from "../lib/mock-store.js";

type ThemeInput = {
  name: string;
  themeType: string;
  infoType: string;
  description?: string;
  sources?: Array<{
    name: string;
    sourceType: string;
    adapterKey: string;
    config?: Record<string, unknown>;
  }>;
};

type ThemeUpdateInput = {
  name?: string;
  description?: string | null;
  status?: string;
};

type ThemeCreateResult = {
  id: string;
  sourceIds: string[];
};

function formatNumberForInsight(value: unknown) {
  if (typeof value === "number") {
    return value.toLocaleString("zh-CN");
  }

  if (value == null || value === "") {
    return null;
  }

  return String(value);
}

function signalLabel(signal?: string | null) {
  switch (signal) {
    case "30d_low":
      return "30天新低";
    case "new_announcement":
      return "新公告";
    case "new_financial_event":
      return "新金融事件";
    case "liquidity_injection":
      return "流动性投放";
    case "liquidity_withdrawal":
      return "流动性回笼";
    case "neutral":
      return "中性";
    default:
      return signal ?? null;
  }
}

function contentUpdateTypeLabel(value: unknown) {
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
      return formatNumberForInsight(value);
  }
}

function buildLatestInsight(
  infoType: string,
  record: { content: Record<string, unknown> } | undefined,
  latestEvent?: { signal: string | null } | null,
) {
  if (!record) {
    return null;
  }

  const content = record.content ?? {};

  if (infoType === "price") {
    const price = formatNumberForInsight(content.price);
    const currency = formatNumberForInsight(content.currency);
    const spec = formatNumberForInsight(content.spec);

    if (!price) {
      return null;
    }

    return [price, currency, spec].filter(Boolean).join(" · ");
  }

  if (infoType === "financial_event") {
    const direction = signalLabel(String(content.direction_label ?? latestEvent?.signal ?? ""));
    const amount = formatNumberForInsight(content.amount_billion_cny);
    const term = formatNumberForInsight(content.term_days);
    const operation = formatNumberForInsight(content.operation_type);

    return [direction, operation, amount ? `${amount}亿元` : null, term ? `${term}天期` : null]
      .filter(Boolean)
      .join(" · ");
  }

  if (infoType === "news_announcement") {
    const topic = formatNumberForInsight(content.release_topic_label);
    const category = formatNumberForInsight(content.category);

    const categoryLabel =
      category === "macro_release"
        ? "宏观发布"
        : category === "news_announcement"
          ? "官方发布"
          : category;
    const publisher = formatNumberForInsight(content.publisher);

    return [topic, categoryLabel, !topic && !categoryLabel ? publisher : null].filter(Boolean).join(" · ");
  }

  if (infoType === "content_update") {
    const updateType = contentUpdateTypeLabel(content.update_type);
    const objectName = formatNumberForInsight(content.object_name);

    return [updateType, objectName].filter(Boolean).join(" · ");
  }

  return null;
}

function buildNewsAnnouncementBreakdown(records: Array<{ content: Record<string, unknown> }>) {
  const counts = new Map<string, number>();

  for (const record of records) {
    const content = record.content ?? {};
    const topic = formatNumberForInsight(content.release_topic_label);
    const category = formatNumberForInsight(content.category);
    const categoryLabel =
      category === "macro_release"
        ? "宏观发布"
        : category === "news_announcement"
          ? "官方发布"
          : category;
    const label = topic || categoryLabel || "未分类";

    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const items = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  if (items.length === 0) {
    return null;
  }

  return {
    title: "发布主题分布",
    description: "按最近抓到的官方发布主题聚合，帮助你快速判断当前宏观关注点。",
    items,
  };
}

function buildFinancialEventBreakdown(records: Array<{ content: Record<string, unknown> }>) {
  const counts = new Map<string, number>();

  for (const record of records) {
    const content = record.content ?? {};
    const label = signalLabel(String(content.direction_label ?? "neutral")) ?? "中性";

    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const items = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  if (items.length === 0) {
    return null;
  }

  return {
    title: "方向分布",
    description: "按结构化金融事件的方向标签聚合，帮助你快速判断近期流动性倾向。",
    items,
  };
}

function buildContentUpdateBreakdown(records: Array<{ content: Record<string, unknown> }>) {
  const counts = new Map<string, number>();

  for (const record of records) {
    const content = record.content ?? {};
    const label = contentUpdateTypeLabel(content.update_type) || formatNumberForInsight(content.object_name) || "未分类";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const items = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  if (items.length === 0) {
    return null;
  }

  return {
    title: "更新类型分布",
    description: "按最近抓到的内容更新类型聚合，帮助你快速判断当前是功能发布、营销动作还是其他页面变更。",
    items,
  };
}

function buildThemeBreakdown(
  infoType: string,
  records: Array<{ content: Record<string, unknown> }>,
) {
  if (infoType === "content_update") {
    return buildContentUpdateBreakdown(records);
  }

  if (infoType === "news_announcement") {
    return buildNewsAnnouncementBreakdown(records);
  }

  if (infoType === "financial_event") {
    return buildFinancialEventBreakdown(records);
  }

  return null;
}

function toTimestamp(value?: string | Date | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildThemeAnalysis(input: {
  themeType: string;
  latestInsight?: string | null;
  events: Array<{ title: string; signal: string | null; occurredAt: string | Date; summary: string }>;
  records?: Array<{ occurredAt: string | Date; content: Record<string, unknown> }>;
  sources: Array<{
    status: string;
    isPaused?: boolean | null;
    latestRunStatus?: string | null;
    latestSuccessAt?: string | Date | null;
    latestFailureAt?: string | Date | null;
  }>;
}) {
  const latestEvent = input.events[0] ?? null;
  const threshold = Date.now() - 24 * 60 * 60 * 1000;
  const recentEventCount = input.events.filter((event) => toTimestamp(event.occurredAt) >= threshold).length;
  const warningCount = input.sources.filter((source) => source.status === "warning").length;
  const pausedCount = input.sources.filter((source) => source.isPaused).length;
  const pendingCount = input.sources.filter((source) => source.latestRunStatus === "pending").length;
  const staleCount = input.sources.filter((source) => {
    const latest = Math.max(toTimestamp(source.latestSuccessAt), toTimestamp(source.latestFailureAt));
    return latest > 0 && latest < Date.now() - 48 * 60 * 60 * 1000;
  }).length;
  const latestPrice =
    input.themeType === "price" && input.records?.length ? Number(input.records[0].content.price ?? NaN) : NaN;
  const olderPrice =
    input.themeType === "price" && input.records && input.records.length > 1
      ? Number(input.records[input.records.length - 1].content.price ?? NaN)
      : NaN;
  const priceDelta =
    Number.isFinite(latestPrice) && Number.isFinite(olderPrice) && olderPrice !== 0
      ? ((latestPrice - olderPrice) / olderPrice) * 100
      : null;

  if (input.themeType === "price") {
    return {
      tone: latestEvent?.signal === "30d_low" ? "positive" : "neutral",
      headline: latestEvent?.signal === "30d_low" ? "当前价格处于近期低位" : "当前价格仍以持续观察为主",
      summary:
        latestEvent?.signal === "30d_low"
          ? `最近一次事件已触发 30 天新低，当前抓到的价格摘要为 ${input.latestInsight ?? "暂无"}。`
          : `当前价格主题最近的关键信息为 ${input.latestInsight ?? "暂无"}，还没有形成更强的买入信号。`,
      keyPoints: [
        latestEvent ? `最新信号：${latestEvent.title}` : "最近没有新的价格事件。",
        input.latestInsight ? `最新价格摘要：${input.latestInsight}` : "最近没有可用的价格摘要。",
        `最近24小时新增 ${recentEventCount} 条事件。`,
      ],
      risks: [
        warningCount > 0 ? `存在 ${warningCount} 个异常来源，当前价格结论需要先复核。`
          : "当前未发现异常来源。",
        pausedCount > 0 ? `有 ${pausedCount} 个来源已暂停，跨平台比价可能不完整。`
          : "当前来源覆盖完整度较好。",
        staleCount > 0 ? `有 ${staleCount} 个来源超过48小时没有新结果，结论可能滞后。`
          : "最近来源更新时效基本正常。",
      ],
      actions: [
        "优先核验最低价是否为同配置、可成交且不是异常挂价。",
        pendingCount > 0 ? "等待排队中的来源完成后，再决定是否要跟进。"
          : "必要时立即运行全部来源，再决定是否跟进。",
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
    };
  }

  if (input.themeType === "financial_event") {
    const directionHeadline =
      latestEvent?.signal === "liquidity_injection"
        ? "近期流动性信号偏宽松"
        : latestEvent?.signal === "liquidity_withdrawal"
          ? "近期流动性信号偏收紧"
          : "近期流动性信号偏中性";

    return {
      tone:
        latestEvent?.signal === "liquidity_injection"
          ? "positive"
          : latestEvent?.signal === "liquidity_withdrawal"
            ? "negative"
            : "neutral",
      headline: directionHeadline,
      summary: latestEvent?.summary ?? "当前还没有足够新的金融事件信号，建议继续等待后续公告。",
      keyPoints: [
        latestEvent ? `最新事件：${latestEvent.title}` : "最近没有新的金融事件。",
        input.latestInsight ? `结构化摘要：${input.latestInsight}` : "最近没有结构化摘要。",
        `最近24小时新增 ${recentEventCount} 条事件。`,
      ],
      risks: [
        warningCount > 0 ? `存在 ${warningCount} 个异常来源，当前判断可能缺少部分公告。`
          : "当前未发现异常来源。",
        pausedCount > 0 ? `有 ${pausedCount} 个来源暂停，后续政策变化可能漏抓。`
          : "当前来源运行状态较稳定。",
        staleCount > 0 ? `有 ${staleCount} 个来源更新滞后，短期判断需要谨慎。`
          : "最近来源更新时效基本正常。",
      ],
      actions: [
        "结合金额、期限、操作类型，判断对短期市场流动性的影响。",
        "如用于交易判断，建议和市场实际反应、后续官方公告交叉验证。",
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
    };
  }

  if (input.themeType === "content_update") {
    return {
      tone: "neutral",
      headline: latestEvent ? "近期内容更新值得优先复核" : "当前以持续跟踪内容更新为主",
      summary:
        latestEvent?.summary ??
        "当前还没有新的内容更新事件，建议继续保持监控，等待下一轮页面变化或版本发布。",
      keyPoints: [
        latestEvent ? `最新更新：${latestEvent.title}` : "最近没有新的内容更新事件。",
        input.latestInsight ? `最近更新摘要：${input.latestInsight}` : "最近没有可用的结构化更新摘要。",
        `最近24小时新增 ${recentEventCount} 条事件。`,
      ],
      risks: [
        warningCount > 0 ? `存在 ${warningCount} 个异常来源，可能漏掉部分更新内容。`
          : "当前未发现异常来源。",
        pausedCount > 0 ? `有 ${pausedCount} 个来源已暂停，跨渠道更新对比可能不完整。`
          : "当前来源覆盖相对完整。",
        staleCount > 0 ? `有 ${staleCount} 个来源超过48小时没有新结果，更新节奏判断可能滞后。`
          : "最近来源更新时效基本正常。",
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
    };
  }

  return {
    tone: "neutral",
    headline: latestEvent ? "近期官方发布值得继续跟踪" : "当前以持续跟踪为主",
    summary: latestEvent?.summary ?? "当前还没有新的官方发布信号，建议继续保持监控。",
    keyPoints: [
      latestEvent ? `最新发布：${latestEvent.title}` : "最近没有新的官方发布。",
      input.latestInsight ? `最近摘要：${input.latestInsight}` : "最近没有可用摘要。",
      `最近24小时新增 ${recentEventCount} 条事件。`,
    ],
    risks: [
      warningCount > 0 ? `存在 ${warningCount} 个异常来源，可能漏掉部分发布。`
        : "当前未发现异常来源。",
      pausedCount > 0 ? `有 ${pausedCount} 个来源处于暂停状态，信息覆盖可能不完整。`
        : "当前来源覆盖相对完整。",
      staleCount > 0 ? `有 ${staleCount} 个来源更新滞后，建议补跑后再判断。`
        : "最近来源更新时效基本正常。",
    ],
    actions: [
      "优先阅读最新发布正文，确认是否需要转成更明确的利好/利空判断。",
      pendingCount > 0 ? "等待排队中的来源完成后，再汇总本轮判断。"
        : "如需更高把握，可立即补跑相关来源。",
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
  };
}

function mapDatabaseThemeSummary(row: {
  id: string;
  name: string;
  theme_type: string;
  status: string;
  latest_run_at: Date | null;
  latest_event_at: Date | null;
  source_count: number | string | bigint;
  latest_success_at: Date | null;
  latest_failure_at: Date | null;
  open_event_count: number | string | bigint;
  tracking_event_count: number | string | bigint;
  ignored_event_count: number | string | bigint;
  unread_event_count: number | string | bigint;
  bookmarked_event_count: number | string | bigint;
  latest_bookmarked_at: Date | null;
}) {
  const latestSuccessAt = row.latest_success_at?.toISOString?.() ?? null;
  const latestFailureAt = row.latest_failure_at?.toISOString?.() ?? null;
  const sourceHealth =
    latestFailureAt && (!latestSuccessAt || latestFailureAt > latestSuccessAt) ? "warning" : "healthy";

  return {
    id: row.id,
    name: row.name,
    type: row.theme_type,
    status: row.status,
    latestRunAt: row.latest_run_at?.toISOString?.() ?? null,
    latestEventAt: row.latest_event_at?.toISOString?.() ?? null,
    sourceCount: Number(row.source_count ?? 0),
    latestSuccessAt,
    latestFailureAt,
    sourceHealth,
    openEventCount: Number(row.open_event_count ?? 0),
    trackingEventCount: Number(row.tracking_event_count ?? 0),
    ignoredEventCount: Number(row.ignored_event_count ?? 0),
    unreadEventCount: Number(row.unread_event_count ?? 0),
    bookmarkedEventCount: Number(row.bookmarked_event_count ?? 0),
    latestBookmarkedAt: row.latest_bookmarked_at?.toISOString?.() ?? null,
  };
}

async function listThemesFromDb(db: Kysely<Database>) {
  const rows = await db
    .selectFrom("themes as t")
    .leftJoin("sources as s", "s.theme_id", "t.id")
    .leftJoin("source_runs as sr", "sr.theme_id", "t.id")
    .leftJoin("events as e", "e.theme_id", "t.id")
    .select(({ fn }) => [
      "t.id as id",
      "t.name as name",
      "t.theme_type as theme_type",
      "t.status as status",
      fn.max("sr.finished_at").as("latest_run_at"),
      fn.max("e.occurred_at").as("latest_event_at"),
      sql<number>`count(distinct s.id)`.as("source_count"),
      sql<number>`count(distinct e.id) filter (where e.status = 'open')`.as("open_event_count"),
      sql<number>`count(distinct e.id) filter (where e.status = 'tracking')`.as("tracking_event_count"),
      sql<number>`count(distinct e.id) filter (where e.status = 'ignored')`.as("ignored_event_count"),
      sql<number>`count(distinct e.id) filter (where coalesce(e.is_read, false) = false)`.as("unread_event_count"),
      sql<number>`count(distinct e.id) filter (where coalesce(e.is_bookmarked, false) = true)`.as("bookmarked_event_count"),
      fn.max("e.bookmarked_at").as("latest_bookmarked_at"),
      fn.max("s.latest_success_at").as("latest_success_at"),
      fn.max("s.latest_failure_at").as("latest_failure_at"),
    ])
    .groupBy(["t.id", "t.name", "t.theme_type", "t.status"])
    .orderBy("t.created_at desc")
    .execute();

  const summaries = rows.map(mapDatabaseThemeSummary);

  const latestEvents = await Promise.all(
    summaries.map(async (summary) => {
      const latestEvent = await db
        .selectFrom("events")
        .select(["title", "signal"])
        .where("theme_id", "=", summary.id)
        .orderBy("occurred_at desc")
        .limit(1)
        .executeTakeFirst();

      return {
        themeId: summary.id,
        latestEventTitle: latestEvent?.title ?? null,
        latestEventSignal: latestEvent?.signal ?? null,
      };
    }),
  );

  const latestRecords = await Promise.all(
    summaries.map(async (summary) => {
      const latestRecord = await db
        .selectFrom("normalized_records")
        .select(["content"])
        .where("theme_id", "=", summary.id)
        .orderBy("occurred_at desc")
        .limit(1)
        .executeTakeFirst();

      return {
        themeId: summary.id,
        latestRecord: latestRecord ?? null,
      };
    }),
  );

  return summaries.map((summary) => {
    const latestEvent = latestEvents.find((item) => item.themeId === summary.id);
    const latestRecord = latestRecords.find((item) => item.themeId === summary.id)?.latestRecord ?? null;

    return {
      ...summary,
      latestEventTitle: latestEvent?.latestEventTitle ?? null,
      latestEventSignal: latestEvent?.latestEventSignal ?? null,
      latestInsight: buildLatestInsight(summary.type, latestRecord ?? undefined, {
        signal: latestEvent?.latestEventSignal ?? null,
      }),
    };
  });
}

async function getThemeDetailFromDb(db: Kysely<Database>, themeId: string) {
  const theme = await db
    .selectFrom("themes")
    .select(["id", "name", "theme_type", "info_type", "description", "status", "created_at"])
    .where("id", "=", themeId)
    .executeTakeFirst();

  if (!theme) {
    return null;
  }

  const sources = await db
    .selectFrom("sources")
    .select([
      "id",
      "name",
      "status",
      "source_type as sourceType",
      "adapter_key as adapterKey",
      "config",
      "is_paused as isPaused",
      "latest_success_at as latestSuccessAt",
      "latest_failure_at as latestFailureAt",
    ])
    .where("theme_id", "=", themeId)
    .orderBy("created_at asc")
    .execute();

  const sourceRunSummaries = await Promise.all(
    sources.map(async (source) => {
      const latestRun = await db
        .selectFrom("source_runs")
        .select([
          "status",
          "started_at as startedAt",
          "finished_at as finishedAt",
        ])
        .where("source_id", "=", source.id)
        .orderBy("created_at desc")
        .limit(1)
        .executeTakeFirst();

      return {
        sourceId: source.id,
        latestRunStatus: latestRun?.status ?? null,
        latestRunAt:
          latestRun?.finishedAt?.toISOString?.() ??
          latestRun?.startedAt?.toISOString?.() ??
          null,
      };
    }),
  );

  const events = await db
    .selectFrom("events")
    .select([
      "id",
      "title",
      "signal",
      "status",
      "is_read as isRead",
      "is_bookmarked as isBookmarked",
      "occurred_at as occurredAt",
      "summary",
    ])
    .where("theme_id", "=", themeId)
    .orderBy("occurred_at desc")
    .limit(10)
    .execute();

  const history = await db
    .selectFrom("source_runs")
    .select([
      "created_at as at",
      "status as label",
    ])
    .where("theme_id", "=", themeId)
    .orderBy("created_at desc")
    .limit(10)
    .execute();

  const timelineRuns = await db
    .selectFrom("source_runs as sr")
    .innerJoin("sources as s", "s.id", "sr.source_id")
    .select([
      "sr.id as id",
      "sr.created_at as at",
      "sr.status as status",
      "sr.trigger_type as triggerType",
      "s.name as sourceName",
    ])
    .where("sr.theme_id", "=", themeId)
    .orderBy("sr.created_at desc")
    .limit(10)
    .execute();

  const timelineChanges = await db
    .selectFrom("changes as c")
    .innerJoin("sources as s", "s.id", "c.source_id")
    .select([
      "c.id as id",
      "c.detected_at as at",
      "c.change_type as changeType",
      "c.summary as summary",
      "c.details as details",
      "s.name as sourceName",
    ])
    .where("c.theme_id", "=", themeId)
    .orderBy("c.detected_at desc")
    .limit(20)
    .execute();

  const timelineEvents = await db
    .selectFrom("events as e")
    .innerJoin("sources as s", "s.id", "e.source_id")
    .select([
      "e.id as id",
      "e.created_at as at",
      "e.signal as signal",
      "e.title as title",
      "e.summary as summary",
      "e.event_type as eventType",
      "s.name as sourceName",
    ])
    .where("e.theme_id", "=", themeId)
    .orderBy("e.created_at desc")
    .limit(20)
    .execute();

  const records = await db
    .selectFrom("normalized_records")
    .select([
      "id",
      "title",
      "occurred_at as occurredAt",
      "info_type as infoType",
      "content",
    ])
    .where("theme_id", "=", themeId)
    .orderBy("occurred_at desc")
    .limit(20)
    .execute();

  const breakdownRecords = await db
    .selectFrom("normalized_records")
    .select(["content"])
    .where("theme_id", "=", themeId)
    .orderBy("occurred_at desc")
    .limit(200)
    .execute();

  const latestInsight = buildLatestInsight(
    theme.info_type,
    records[0] ? { content: records[0].content as Record<string, unknown> } : undefined,
    events[0] ? { signal: events[0].signal } : null,
  );
  const breakdown = buildThemeBreakdown(
    theme.info_type,
    breakdownRecords.map((item) => ({ content: item.content as Record<string, unknown> })),
  );

  const timeline = [
    ...timelineRuns.map((item) => ({
      id: item.id,
      kind: "run",
      at: item.at.toISOString?.() ?? item.at,
      title: `Source run ${item.status}`,
      summary: `${item.sourceName} · trigger: ${item.triggerType}`,
      meta: {
        status: item.status,
        triggerType: item.triggerType,
        sourceName: item.sourceName,
      },
    })),
    ...timelineChanges.map((item) => ({
      id: item.id,
      kind: "change",
      at: item.at.toISOString?.() ?? item.at,
      title: item.changeType,
      summary: item.summary,
      meta: {
        sourceName: item.sourceName,
        details: item.details,
      },
    })),
    ...timelineEvents.map((item) => ({
      id: item.id,
      kind: "event",
      at: item.at.toISOString?.() ?? item.at,
      title: item.title,
      summary: item.summary,
      meta: {
        signal: item.signal,
        eventType: item.eventType,
        sourceName: item.sourceName,
      },
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  const analysis = buildThemeAnalysis({
    themeType: theme.theme_type,
    latestInsight,
    events: events.map((item) => ({
      title: item.title,
      signal: item.signal,
      occurredAt: item.occurredAt,
      summary: item.summary,
    })),
    records: records.map((item) => ({
      occurredAt: item.occurredAt,
      content: item.content as Record<string, unknown>,
    })),
    sources: sources.map((item) => ({
      status: item.status,
      isPaused: item.isPaused,
      latestRunStatus: sourceRunSummaries.find((summary) => summary.sourceId === item.id)?.latestRunStatus ?? null,
      latestSuccessAt: item.latestSuccessAt,
      latestFailureAt: item.latestFailureAt,
    })),
  });

  return {
    theme: {
      id: theme.id,
      name: theme.name,
      type: theme.theme_type,
      infoType: theme.info_type,
      description: theme.description,
      status: theme.status,
      createdAt: theme.created_at,
      latestInsight,
    },
    sources: sources.map((item) => ({
      ...item,
      latestSuccessAt: item.latestSuccessAt?.toISOString?.() ?? null,
      latestFailureAt: item.latestFailureAt?.toISOString?.() ?? null,
      latestRunStatus:
        sourceRunSummaries.find((summary) => summary.sourceId === item.id)?.latestRunStatus ?? null,
      latestRunAt:
        sourceRunSummaries.find((summary) => summary.sourceId === item.id)?.latestRunAt ?? null,
    })),
    events: events.map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString?.() ?? item.occurredAt,
    })),
    history: history.map((item) => ({
      at: item.at.toISOString?.() ?? item.at,
      label: item.label,
    })),
    breakdown,
    timeline,
    records: records.map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString?.() ?? item.occurredAt,
    })),
    analysis,
  };
}

async function createThemeInDb(db: Kysely<Database>, input: ThemeInput): Promise<ThemeCreateResult> {
  const now = new Date().toISOString();
  const themeId = createId("theme");
  const sourceIds: string[] = [];

  await db
    .insertInto("themes")
    .values({
      id: themeId,
      name: input.name,
      theme_type: input.themeType,
      info_type: input.infoType,
      description: input.description ?? null,
      status: "active",
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .execute();

  if (input.sources?.length) {
    const sourceRows = input.sources.map((source) => {
      const sourceId = createId("source");
      sourceIds.push(sourceId);

      return {
        id: sourceId,
        theme_id: themeId,
        name: source.name,
        source_type: source.sourceType,
        adapter_key: source.adapterKey,
        status: "active",
        is_paused: false,
        config: source.config ?? {},
        created_at: now,
        updated_at: now,
      };
    });

    await db
      .insertInto("sources")
      .values(sourceRows)
      .execute();
  }

  return {
    id: themeId,
    sourceIds,
  };
}

export async function listThemes() {
  const db = getDatabase();

  if (!db) {
    return mockThemes.map((theme) => {
      const themeEvents = mockEvents.filter((event) => event.themeId === theme.id);

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
  }

  return listThemesFromDb(db);
}

export async function getThemeDetail(themeId: string) {
  const db = getDatabase();

  if (!db) {
    const theme = mockThemes.find((item) => item.id === themeId);

    if (!theme) {
      return null;
    }

    return {
      theme,
      sources: mockSources.filter((item) => item.themeId === themeId),
      events: mockEvents.filter((item) => item.themeId === themeId),
      history: [
        { at: "2026-05-30T09:30:00Z", label: "Historical snapshot stored" },
        { at: "2026-05-31T09:30:00Z", label: "Minor price decline detected" },
        { at: "2026-06-01T09:31:00Z", label: "30-day low event emitted" },
      ],
      breakdown: null,
      timeline: [],
      records: [],
      analysis: buildThemeAnalysis({
        themeType: theme.type,
        latestInsight: null,
        events: mockEvents
          .filter((item) => item.themeId === themeId)
          .map((item) => ({
            title: item.title,
            signal: item.signal,
            occurredAt: item.occurredAt,
            summary: item.summary,
          })),
        records: [],
        sources: mockSources
          .filter((item) => item.themeId === themeId)
          .map((item) => ({
            status: item.status,
            isPaused: item.isPaused,
            latestRunStatus: item.latestRunStatus,
            latestSuccessAt: item.latestSuccessAt,
            latestFailureAt: item.latestFailureAt,
          })),
      }),
    };
  }

  return getThemeDetailFromDb(db, themeId);
}

export async function createTheme(input: ThemeInput) {
  const db = getDatabase();

  if (!db) {
    const themeId = createId("theme");
    const sourceIds: string[] = [];
    mockThemes.unshift({
      id: themeId,
      name: input.name,
      type: input.themeType,
      status: "active",
      latestRunAt: new Date().toISOString(),
      latestEventAt: null,
      sourceCount: input.sources?.length ?? 0,
    });

    input.sources?.forEach((source) => {
      const sourceId = createId("source");
      sourceIds.push(sourceId);
      mockSources.push({
        id: sourceId,
        themeId,
        themeName: input.name,
        name: source.name,
        status: "active",
        latestSuccessAt: null,
        latestFailureAt: null,
      });
    });

    return { id: themeId, sourceIds };
  }

  return createThemeInDb(db, input);
}

export async function updateTheme(themeId: string, input: ThemeUpdateInput) {
  const db = getDatabase();

  if (!db) {
    const theme = mockThemes.find((item) => item.id === themeId);

    if (!theme) {
      return null;
    }

    if (input.name !== undefined) {
      const nextName = input.name;
      theme.name = nextName;
      mockSources.forEach((source) => {
        if (source.themeId === themeId) {
          source.themeName = nextName;
        }
      });
      mockEvents.forEach((event) => {
        if (event.themeId === themeId) {
          event.themeName = nextName;
        }
      });
    }

    if (input.description !== undefined) {
      // mock theme summary does not persist description
    }

    if (input.status !== undefined) {
      theme.status = input.status;
    }

    return { id: themeId };
  }

  const existing = await db
    .selectFrom("themes")
    .select(["id"])
    .where("id", "=", themeId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  const nextValues: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    nextValues.name = input.name;
  }

  if (input.description !== undefined) {
    nextValues.description = input.description;
  }

  if (input.status !== undefined) {
    nextValues.status = input.status;
  }

  await db
    .updateTable("themes")
    .set(nextValues)
    .where("id", "=", themeId)
    .execute();

  return { id: themeId };
}

export async function deleteTheme(themeId: string) {
  const db = getDatabase();

  if (!db) {
    const index = mockThemes.findIndex((item) => item.id === themeId);

    if (index === -1) {
      return null;
    }

    mockThemes.splice(index, 1);

    for (let i = mockSources.length - 1; i >= 0; i -= 1) {
      if (mockSources[i].themeId === themeId) {
        mockSources.splice(i, 1);
      }
    }

    for (let i = mockEvents.length - 1; i >= 0; i -= 1) {
      if (mockEvents[i].themeId === themeId) {
        mockEvents.splice(i, 1);
      }
    }

    return { id: themeId };
  }

  const existing = await db
    .selectFrom("themes")
    .select(["id"])
    .where("id", "=", themeId)
    .executeTakeFirst();

  if (!existing) {
    return null;
  }

  await db
    .deleteFrom("themes")
    .where("id", "=", themeId)
    .execute();

  return { id: themeId };
}
