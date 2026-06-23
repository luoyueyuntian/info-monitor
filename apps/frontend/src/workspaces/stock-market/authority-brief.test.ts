import { describe, expect, it } from "vitest";

import type { EventSummary, SourceStatus, ThemeSummary } from "../../lib/api";
import { buildStockMarketAuthorityBrief } from "./authority-brief";

const themes: ThemeSummary[] = [
  {
    id: "theme-pbc-open-market",
    name: "PBOC Open Market Operations",
    type: "financial_event",
    status: "active",
    latestRunAt: "2026-06-18T08:10:00+08:00",
    latestEventAt: "2026-06-18T08:00:00+08:00",
    sourceCount: 1,
  },
  {
    id: "theme-pbc-news",
    name: "央行新闻发布",
    type: "news_announcement",
    status: "active",
    latestRunAt: "2026-06-18T07:55:00+08:00",
    latestEventAt: "2026-06-18T07:50:00+08:00",
    sourceCount: 1,
  },
  {
    id: "theme-sse-announcements",
    name: "上交所公告跟踪",
    type: "news_announcement",
    status: "active",
    latestRunAt: "2026-06-18T09:10:00+08:00",
    latestEventAt: "2026-06-18T09:05:00+08:00",
    sourceCount: 1,
  },
];

const sources: SourceStatus[] = [
  {
    id: "source-pbc-open-market",
    themeId: "theme-pbc-open-market",
    themeName: "PBOC Open Market Operations",
    name: "PBOC Open Market List",
    status: "healthy",
    sourceType: "page_list",
    adapterKey: "pbc_open_market_announcements",
    latestSuccessAt: "2026-06-18T08:10:00+08:00",
    latestFailureAt: null,
  },
  {
    id: "source-pbc-news",
    themeId: "theme-pbc-news",
    themeName: "央行新闻发布",
    name: "PBOC News List",
    status: "warning",
    sourceType: "page_list",
    adapterKey: "pbc_news_list",
    latestSuccessAt: "2026-06-18T07:55:00+08:00",
    latestFailureAt: "2026-06-18T08:20:00+08:00",
  },
  {
    id: "source-sse-announcements",
    themeId: "theme-sse-announcements",
    themeName: "上交所公告跟踪",
    name: "上交所公告源",
    status: "healthy",
    sourceType: "api",
    adapterKey: "generic_news_announcement_list",
    latestSuccessAt: "2026-06-18T09:10:00+08:00",
    latestFailureAt: null,
  },
];

const events: EventSummary[] = [
  {
    id: "event-pbc-open-market",
    themeId: "theme-pbc-open-market",
    themeName: "PBOC Open Market Operations",
    title: "央行开展逆回购操作公告",
    signal: "new_financial_event",
    occurredAt: "2026-06-18T08:00:00+08:00",
    summary: "央行早间开展逆回购操作，释放流动性观察线索。",
    infoType: "financial_event",
    context: {
      publisher: "中国人民银行",
    },
  },
  {
    id: "event-pbc-news",
    themeId: "theme-pbc-news",
    themeName: "央行新闻发布",
    title: "央行开展逆回购操作公告",
    signal: "new_announcement",
    occurredAt: "2026-06-18T07:50:00+08:00",
    summary: "央行新闻栏同步披露逆回购操作安排。",
    infoType: "news_announcement",
    context: {
      publisher: "中国人民银行",
    },
  },
  {
    id: "event-sse",
    themeId: "theme-sse-announcements",
    themeName: "上交所公告跟踪",
    title: "上交所披露上市公司停牌核查进展",
    signal: "new_announcement",
    occurredAt: "2026-06-18T09:05:00+08:00",
    summary: "上交所更新上市公司停牌核查进展公告。",
    infoType: "news_announcement",
    context: {
      publisher: "上海证券交易所",
    },
  },
];

describe("buildStockMarketAuthorityBrief", () => {
  it("dedupes same-title authority items inside a section", () => {
    const brief = buildStockMarketAuthorityBrief({ themes, events, sources });

    const policy = brief.sections.find((section) => section.id === "policy");
    expect(policy).toBeDefined();
    expect(policy?.items).toHaveLength(1);
    expect(policy?.items[0].mergedCount).toBe(2);
    expect(policy?.items[0].sourceNames).toEqual(["PBOC Open Market List", "PBOC News List"]);
    expect(policy?.items[0].sourceHealth).toBe("mixed");
  });

  it("classifies exchange announcement sources from generic feeds", () => {
    const brief = buildStockMarketAuthorityBrief({ themes, events, sources });

    const exchange = brief.sections.find((section) => section.id === "exchange");
    expect(exchange).toBeDefined();
    expect(exchange?.items[0].title).toContain("上交所");
    expect(exchange?.items[0].authorityLabels).toContain("上交所");
  });
});
