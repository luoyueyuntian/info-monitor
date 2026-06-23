import type {
  StockMarketAuthorityBrief,
  StockMarketAuthorityBriefItem,
  StockMarketAuthorityBriefSection,
  StockMarketAuthoritySectionId,
} from "@info-monitor/shared-contracts";

import { listInboxSectionEvents } from "./event-service.js";
import { listSourceStatuses } from "./source-service.js";
import { listThemes } from "./theme-service.js";

type AuthoritySourceMeta = {
  sectionId: StockMarketAuthoritySectionId;
  label: string;
};

type AuthorityThemeInput = {
  id: string;
  name: string;
};

type AuthorityEventInput = {
  themeId: string;
  themeName: string;
  title: string;
  signal?: string | null;
  occurredAt: string;
  summary: string;
  context?: Record<string, unknown> | null;
};

type AuthoritySourceInput = {
  themeId: string;
  themeName: string;
  name: string;
  status: string;
  adapterKey?: string;
};

const sectionOrder: StockMarketAuthoritySectionId[] = ["policy", "macro", "regulatory", "exchange"];

const sectionLabels: Record<StockMarketAuthoritySectionId, string> = {
  policy: "政策与流动性",
  macro: "宏观数据",
  regulatory: "监管口径",
  exchange: "交易所公告",
};

const authorityAdapterMeta: Record<string, AuthoritySourceMeta> = {
  pbc_open_market_announcements: { sectionId: "policy", label: "中国人民银行公开市场" },
  pbc_news_list: { sectionId: "policy", label: "中国人民银行" },
  stats_data_release_list: { sectionId: "macro", label: "国家统计局" },
  csrc_announcements: { sectionId: "regulatory", label: "中国证监会" },
  cbirc_announcements: { sectionId: "regulatory", label: "金融监管总局" },
  hkex_announcements: { sectionId: "exchange", label: "港交所" },
  ndrc_announcements: { sectionId: "macro", label: "国家发改委" },
  sse_announcements: { sectionId: "exchange", label: "上交所" },
  szse_announcements: { sectionId: "exchange", label: "深交所" },
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeTitle(value: string) {
  return normalizeText(value).replace(/[\s:：,，.。/\\|()[\]【】'"`“”‘’_-]+/g, "");
}

function uniqueStrings(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))];
}

function authorityMetaForSource(source: AuthoritySourceInput): AuthoritySourceMeta | null {
  const direct = source.adapterKey ? authorityAdapterMeta[source.adapterKey] : null;
  if (direct) {
    return direct;
  }

  const text = normalizeText([source.name, source.themeName, source.adapterKey].filter(Boolean).join(" "));
  if (text.includes("上交所") || text.includes("sse")) {
    return { sectionId: "exchange", label: "上交所" };
  }
  if (text.includes("深交所") || text.includes("szse")) {
    return { sectionId: "exchange", label: "深交所" };
  }
  if (text.includes("港交所") || text.includes("披露易") || text.includes("hkex")) {
    return { sectionId: "exchange", label: "港交所" };
  }

  return null;
}

function readContextString(event: AuthorityEventInput, key: string) {
  const value = event.context?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function resolveSectionId(
  event: AuthorityEventInput,
  sourceMetas: AuthoritySourceMeta[],
): StockMarketAuthoritySectionId | null {
  const publisher = normalizeText(readContextString(event, "publisher"));
  const text = normalizeText(`${event.title} ${event.summary}`);

  if (
    publisher.includes("上交所") ||
    publisher.includes("深交所") ||
    publisher.includes("港交所") ||
    text.includes("上交所") ||
    text.includes("深交所") ||
    text.includes("港交所")
  ) {
    return "exchange";
  }

  if (publisher.includes("人民银行")) {
    return "policy";
  }
  if (publisher.includes("统计局") || text.includes("统计局")) {
    return "macro";
  }
  if (publisher.includes("证监会") || publisher.includes("金融监管总局")) {
    return "regulatory";
  }
  if (publisher.includes("发改委")) {
    return "macro";
  }

  return sourceMetas[0]?.sectionId ?? null;
}

function toTimestamp(value: string | null | undefined) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function mergeHealth(
  current: StockMarketAuthorityBriefItem["sourceHealth"],
  nextStatus: string,
): StockMarketAuthorityBriefItem["sourceHealth"] {
  const nextHealth = nextStatus === "healthy" ? "healthy" : "warning";
  if (current === "unknown") {
    return nextHealth;
  }
  if (current === nextHealth) {
    return current;
  }
  return "mixed";
}

function buildSectionSummary(sectionId: StockMarketAuthoritySectionId, items: StockMarketAuthorityBriefItem[]) {
  const latest = items[0];
  if (!latest) {
    return "";
  }

  const mergedHint = latest.mergedCount > 1 ? `，已归并 ${latest.mergedCount} 条同题线索` : "";
  switch (sectionId) {
    case "policy":
      return `最近的政策与流动性线索是「${latest.title}」${mergedHint}。`;
    case "macro":
      return `最近的宏观数据线索是「${latest.title}」${mergedHint}。`;
    case "regulatory":
      return `最近的监管口径线索是「${latest.title}」${mergedHint}。`;
    case "exchange":
      return `最近的交易所公告线索是「${latest.title}」${mergedHint}。`;
    default:
      return `最近更新是「${latest.title}」${mergedHint}。`;
  }
}

export function buildStockMarketAuthorityBriefFromData(input: {
  themes: AuthorityThemeInput[];
  events: AuthorityEventInput[];
  sources: AuthoritySourceInput[];
}): StockMarketAuthorityBrief {
  const themeById = new Map(input.themes.map((theme) => [theme.id, theme]));
  const sourcesByTheme = new Map<string, AuthoritySourceInput[]>();

  for (const source of input.sources) {
    const list = sourcesByTheme.get(source.themeId) ?? [];
    list.push(source);
    sourcesByTheme.set(source.themeId, list);
  }

  const authoritySources = input.sources.filter((source) => authorityMetaForSource(source));
  const warningSourceCount = authoritySources.filter((source) => source.status !== "healthy").length;
  const sectionBuckets = new Map<StockMarketAuthoritySectionId, Map<string, StockMarketAuthorityBriefItem>>();

  for (const event of [...input.events].sort((left, right) => toTimestamp(right.occurredAt) - toTimestamp(left.occurredAt))) {
    const theme = themeById.get(event.themeId);
    const themeSources = sourcesByTheme.get(event.themeId) ?? [];
    const sourceMetas = uniqueStrings(
      themeSources.flatMap((source) => {
        const meta = authorityMetaForSource(source);
        return meta ? [JSON.stringify(meta)] : [];
      }),
    ).map((value) => JSON.parse(value) as AuthoritySourceMeta);

    if (!sourceMetas.length) {
      continue;
    }

    const sectionId = resolveSectionId(event, sourceMetas);
    if (!sectionId) {
      continue;
    }

    const key = `${sectionId}:${normalizeTitle(event.title)}:${event.occurredAt.slice(0, 10)}`;
    const sectionMap = sectionBuckets.get(sectionId) ?? new Map<string, StockMarketAuthorityBriefItem>();
    const sourceNames = themeSources.map((source) => source.name);
    const authorityLabels = sourceMetas.map((meta) => meta.label);
    const existing = sectionMap.get(key);

    if (!existing) {
      let sourceHealth: StockMarketAuthorityBriefItem["sourceHealth"] = "unknown";
      for (const source of themeSources) {
        sourceHealth = mergeHealth(sourceHealth, source.status);
      }

      sectionMap.set(key, {
        key,
        title: event.title,
        summary: event.summary,
        occurredAt: event.occurredAt,
        themeId: theme?.id ?? event.themeId,
        themeName: theme?.name ?? event.themeName,
        signal: typeof event.signal === "string" ? event.signal : null,
        sourceNames: uniqueStrings(sourceNames),
        authorityLabels: uniqueStrings(authorityLabels),
        mergedCount: 1,
        sourceHealth,
      });
    } else {
      existing.mergedCount += 1;
      existing.sourceNames = uniqueStrings([...existing.sourceNames, ...sourceNames]);
      existing.authorityLabels = uniqueStrings([...existing.authorityLabels, ...authorityLabels]);
      for (const source of themeSources) {
        existing.sourceHealth = mergeHealth(existing.sourceHealth, source.status);
      }

      if (toTimestamp(event.occurredAt) > toTimestamp(existing.occurredAt)) {
        existing.title = event.title;
        existing.summary = event.summary;
        existing.occurredAt = event.occurredAt;
        existing.themeId = theme?.id ?? event.themeId;
        existing.themeName = theme?.name ?? event.themeName;
        existing.signal = typeof event.signal === "string" ? event.signal : null;
      }
    }

    sectionBuckets.set(sectionId, sectionMap);
  }

  const sections = sectionOrder
    .map((sectionId) => {
      const items = [...(sectionBuckets.get(sectionId)?.values() ?? [])]
        .sort((left, right) => toTimestamp(right.occurredAt) - toTimestamp(left.occurredAt));
      if (!items.length) {
        return null;
      }

      return {
        id: sectionId,
        label: sectionLabels[sectionId],
        summary: buildSectionSummary(sectionId, items),
        items,
      } satisfies StockMarketAuthorityBriefSection;
    })
    .filter((section): section is StockMarketAuthorityBriefSection => Boolean(section));

  const mergedItemCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  const highlights = sections
    .map((section) => section.items[0] ? `${section.label}：${section.items[0].title}` : null)
    .filter((item): item is string => Boolean(item))
    .slice(0, 4);

  const summary =
    mergedItemCount > 0
      ? `已归并 ${mergedItemCount} 条权威站点线索，覆盖 ${authoritySources.length} 个来源。${warningSourceCount > 0 ? `当前有 ${warningSourceCount} 个来源处于告警状态，结论需结合来源健康度复核。` : "当前权威来源运行整体稳定。"}`
      : "当前还没有可用于股市复盘的权威站点线索。";

  return {
    generatedAt: new Date().toISOString(),
    summary,
    highlights,
    mergedItemCount,
    trackedSourceCount: authoritySources.length,
    warningSourceCount,
    sections,
  };
}

export async function getStockMarketAuthorityBrief(): Promise<StockMarketAuthorityBrief> {
  const [themes, events, sources] = await Promise.all([
    listThemes(),
    listInboxSectionEvents(),
    listSourceStatuses(),
  ]);

  return buildStockMarketAuthorityBriefFromData({
    themes,
    events,
    sources,
  });
}
