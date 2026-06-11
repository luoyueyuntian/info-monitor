import { describe, expect, it } from "vitest";

import type { ThemeDetail } from "../../../../lib/api";
import { buildThemeSourceCompareData } from "./theme-detail-source-compare";

const makePriceDetail = (): ThemeDetail => ({
  theme: {
    id: "theme_price_1",
    name: "Surface Price",
    type: "price",
    status: "active",
  },
  sources: [
    {
      id: "source_a",
      name: "闲鱼",
      status: "healthy",
      latestSuccessAt: "2026-06-01T01:00:00.000Z",
      latestFailureAt: null,
    },
    {
      id: "source_b",
      name: "转转",
      status: "healthy",
      latestSuccessAt: "2026-06-01T01:10:00.000Z",
      latestFailureAt: null,
    },
    {
      id: "source_c",
      name: "爱回收",
      status: "warning",
      latestSuccessAt: null,
      latestFailureAt: "2026-06-01T01:20:00.000Z",
    },
  ],
  events: [],
  history: [],
  breakdown: null,
  timeline: [],
  records: [
    {
      id: "record_a",
      sourceId: "source_a",
      sourceName: "闲鱼",
      title: "闲鱼同配置价格",
      occurredAt: "2026-06-01T01:00:00.000Z",
      infoType: "price",
      content: {
        price: 3999,
        currency: "CNY",
        spec: "16G+512G",
      },
    },
    {
      id: "record_b",
      sourceId: "source_b",
      sourceName: "转转",
      title: "转转同配置价格",
      occurredAt: "2026-06-01T01:10:00.000Z",
      infoType: "price",
      content: {
        price: 4288,
        currency: "CNY",
        spec: "16G+512G",
      },
    },
  ],
  analysis: {
    tone: "positive",
    headline: "headline",
    summary: "summary",
    keyPoints: [],
    risks: [],
    actions: [],
    recentChange: { headline: "recent", summary: "recent", highlights: [] },
    trend: { headline: "trend", summary: "trend", highlights: [] },
  },
});

describe("theme-detail-source-compare", () => {
  it("builds price comparison across sources", () => {
    const detail = makePriceDetail();
    detail.records.push(
      {
        id: "record_a_prev",
        sourceId: "source_a",
        sourceName: "闲鱼",
        title: "闲鱼同配置价格",
        occurredAt: "2026-05-30T01:00:00.000Z",
        infoType: "price",
        content: {
          price: 4099,
          currency: "CNY",
          spec: "16G+512G",
        },
      },
      {
        id: "record_b_prev",
        sourceId: "source_b",
        sourceName: "转转",
        title: "转转同配置价格",
        occurredAt: "2026-05-30T01:10:00.000Z",
        infoType: "price",
        content: {
          price: 4200,
          currency: "CNY",
          spec: "16G+512G",
        },
      },
    );

    const compare = buildThemeSourceCompareData(detail);

    expect(compare.headline).toBe("跨来源价格快照");
    expect(compare.stats[0]).toBe("已覆盖 2/3 个来源");
    expect(compare.stats[1]).toBe("当前价差 289 CNY");
    expect(compare.diagnostic).toMatchObject({
      tone: "warning",
      toneLabel: "需先复核",
    });
    expect(compare.diagnostic?.keyPoints[2]).toBe("当前有 1 个来源处于异常状态。");
    expect(compare.diagnostic?.timing?.headline).toContain("最低来源暂时比较稳定");
    expect(compare.diagnostic?.timing?.signals[0]).toContain("最低来源仍是 闲鱼");
    expect(compare.items[0]).toMatchObject({
      sourceId: "source_a",
      badge: "当前最低",
      primaryValue: "3,999 CNY",
      trendLabel: "持续下探",
      trendDeltaLabel: "-2.4%",
    });
    expect(compare.items[0].trendPoints).toHaveLength(2);
    expect(compare.items[1]).toMatchObject({
      sourceId: "source_b",
      badge: "当前较高",
      deltaLabel: "较最低 +7.2%",
      trendLabel: "短线回升",
      trendDeltaLabel: "+2.1%",
    });
    expect(compare.items[2]).toMatchObject({
      sourceId: "source_c",
      hasRecord: false,
      title: "暂无标准化记录",
    });
  });

  it("builds non-price latest snapshot view", () => {
    const detail = makePriceDetail();
    detail.theme.type = "financial_event";
    detail.sources = detail.sources.slice(0, 1);
    detail.records = [
      {
        id: "record_fin_1",
        sourceId: "source_a",
        sourceName: "央行",
        title: "公开市场操作公告",
        occurredAt: "2026-06-01T02:00:00.000Z",
        infoType: "financial_event",
        content: {
          direction_label: "liquidity_injection",
          amount_billion_cny: 1200,
          operation_type: "逆回购",
          announcement_no: "[2026]第88号",
          direction_reason: "净投放规模扩大。",
        },
      },
      {
        id: "record_fin_2",
        sourceId: "source_a",
        sourceName: "央行",
        title: "公开市场操作公告",
        occurredAt: "2026-05-31T02:00:00.000Z",
        infoType: "financial_event",
        content: {
          direction_label: "liquidity_injection",
          amount_billion_cny: 980,
          operation_type: "逆回购",
          announcement_no: "[2026]第87号",
          direction_reason: "连续净投放。",
        },
      },
    ];

    const compare = buildThemeSourceCompareData(detail);

    expect(compare.headline).toBe("跨来源最新快照");
    expect(compare.diagnostic).toMatchObject({
      tone: "healthy",
      toneLabel: "方向强化",
    });
    expect(compare.diagnostic?.timing?.headline).toContain("方向正在连续强化");
    expect(compare.items[0]).toMatchObject({
      sourceId: "source_a",
      badge: "最新更新",
      primaryValue: "流动性投放",
      secondaryValue: "1,200 亿元 · 逆回购",
      tertiaryValue: "[2026]第88号",
      trendLabel: null,
    });
  });

  it("marks financial-event direction switching as pending follow-up", () => {
    const detail = makePriceDetail();
    detail.theme.type = "financial_event";
    detail.sources = detail.sources.slice(0, 1);
    detail.records = [
      {
        id: "record_fin_1",
        sourceId: "source_a",
        sourceName: "央行",
        title: "公开市场操作公告",
        occurredAt: "2026-06-01T02:00:00.000Z",
        infoType: "financial_event",
        content: {
          direction_label: "liquidity_withdrawal",
          amount_billion_cny: 300,
          operation_type: "逆回购",
          announcement_no: "[2026]第89号",
          direction_reason: "净回笼。",
        },
      },
      {
        id: "record_fin_2",
        sourceId: "source_a",
        sourceName: "央行",
        title: "公开市场操作公告",
        occurredAt: "2026-05-31T02:00:00.000Z",
        infoType: "financial_event",
        content: {
          direction_label: "liquidity_injection",
          amount_billion_cny: 980,
          operation_type: "逆回购",
          announcement_no: "[2026]第87号",
          direction_reason: "连续净投放。",
        },
      },
    ];

    const compare = buildThemeSourceCompareData(detail);

    expect(compare.diagnostic).toMatchObject({
      tone: "pending",
      toneLabel: "方向反复",
    });
    expect(compare.diagnostic?.timing?.headline).toContain("方向正在发生切换");
  });

  it("marks complete price coverage with clear spread as high-value review", () => {
    const detail = makePriceDetail();
    detail.sources = detail.sources.slice(0, 2);
    detail.records.push(
      {
        id: "record_a_prev",
        sourceId: "source_a",
        sourceName: "闲鱼",
        title: "闲鱼同配置价格",
        occurredAt: "2026-05-30T01:00:00.000Z",
        infoType: "price",
        content: {
          price: 4180,
          currency: "CNY",
          spec: "16G+512G",
        },
      },
      {
        id: "record_b_prev",
        sourceId: "source_b",
        sourceName: "转转",
        title: "转转同配置价格",
        occurredAt: "2026-05-30T01:10:00.000Z",
        infoType: "price",
        content: {
          price: 4230,
          currency: "CNY",
          spec: "16G+512G",
        },
      },
    );

    const compare = buildThemeSourceCompareData(detail);

    expect(compare.diagnostic).toMatchObject({
      tone: "healthy",
      toneLabel: "价差明显",
    });
    expect(compare.diagnostic?.headline).toContain("价差已经拉开");
    expect(compare.diagnostic?.timing?.signals[1]).toContain("当前价差较上一轮扩大");
  });

  it("marks incomplete but non-warning coverage as pending follow-up", () => {
    const detail = makePriceDetail();
    detail.sources[2].status = "healthy";
    detail.sources[2].latestFailureAt = null;
    detail.records.push(
      {
        id: "record_a_prev",
        sourceId: "source_a",
        sourceName: "闲鱼",
        title: "闲鱼同配置价格",
        occurredAt: "2026-05-30T01:00:00.000Z",
        infoType: "price",
        content: {
          price: 4050,
          currency: "CNY",
          spec: "16G+512G",
        },
      },
      {
        id: "record_b_prev",
        sourceId: "source_b",
        sourceName: "转转",
        title: "转转同配置价格",
        occurredAt: "2026-05-30T01:10:00.000Z",
        infoType: "price",
        content: {
          price: 4180,
          currency: "CNY",
          spec: "16G+512G",
        },
      },
    );

    const compare = buildThemeSourceCompareData(detail);

    expect(compare.diagnostic).toMatchObject({
      tone: "pending",
      toneLabel: "覆盖不全",
    });
    expect(compare.diagnostic?.keyPoints[2]).toBe("仍有 1 个来源缺少最近价格记录。");
    expect(compare.diagnostic?.timing?.headline).toContain("最低来源暂时比较稳定");
  });
});
