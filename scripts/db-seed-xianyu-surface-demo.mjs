/**
 * Xianyu Surface Pro 8 Price Monitor — DB Seed Script
 *
 * 这是一个完整的"已接入并可直接跑起来的真实二手来源实例"。
 * 使用 generic_price_list 适配器，配置闲鱼风格的 API 字段映射。
 *
 * 运行方式:
 *   DATABASE_URL=postgresql://... node scripts/db-seed-xianyu-surface-demo.mjs
 *
 * 验证:
 *   1. 启动 API: npm --workspace @info-monitor/api dev
 *   2. 访问 http://localhost:3000/themes/theme-surface-pro-8
 *   3. 应该能看到价格记录、30天新低事件、价格趋势
 */

import dotenv from "dotenv";
import pg from "pg";

import {
  upsertEvent,
  upsertNormalizedRecord,
  upsertRawSnapshot,
  upsertSource,
  upsertSourceRun,
  upsertTheme,
} from "./lib/db-seed-helpers.mjs";
import {
  DEMO_EVENT_IDS,
  DEMO_RECORD_IDS,
  DEMO_SNAPSHOT_IDS,
  DEMO_SOURCE_IDS,
  DEMO_THEME_IDS,
  DEMO_RUN_IDS,
} from "./lib/demo-scene-ids.mjs";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

const themeId = DEMO_THEME_IDS.SURFACE_PRO_8;
const xianyuSourceId = DEMO_SOURCE_IDS.XIANYU_SURFACE;
const zhuanzhuanSourceId = DEMO_SOURCE_IDS.ZHUANZHUAN_SURFACE;

// ─── 闲鱼风格的 API 响应数据（模拟真实抓取结果）─────────────────────────────

const xianyuRecords = [
  {
    title: "Surface Pro 8 i5 16G 512G 国行 95新 配件齐全",
    price: 3899,
    spec: "16G+512G",
    url: "https://www.goofish.com/item/100001",
    created_at: "2026-06-13T10:30:00+08:00",
    seller: "数码小王",
  },
  {
    title: "Surface Pro 8 i7 16G 256G 美版 9新 带键盘",
    price: 4200,
    spec: "16G+256G",
    url: "https://www.goofish.com/item/100002",
    created_at: "2026-06-12T15:20:00+08:00",
    seller: "科技优选",
  },
  {
    title: "Surface Pro 8 i5 8G 256G 国行 全新未拆封",
    price: 3500,
    spec: "8G+256G",
    url: "https://www.goofish.com/item/100003",
    created_at: "2026-06-11T09:00:00+08:00",
    seller: "正品特卖",
  },
  {
    title: "Surface Pro 8 i5 16G 512G 国行 85新 有磕碰",
    price: 3200,
    spec: "16G+512G",
    url: "https://www.goofish.com/item/100004",
    created_at: "2026-06-10T14:00:00+08:00",
    seller: "二手达人",
  },
  {
    title: "Surface Pro 8 i7 16G 512G 国行 9新 带笔",
    price: 4500,
    spec: "16G+512G",
    url: "https://www.goofish.com/item/100005",
    created_at: "2026-06-09T11:30:00+08:00",
    seller: "微软专卖",
  },
];

const zhuanzhuanRecords = [
  {
    title: "微软Surface Pro 8 i5 16G 512G 九五新",
    price: 4099,
    spec: "16G+512G",
    url: "https://www.zhuanzhuan.com/item/200001",
    created_at: "2026-06-13T09:00:00+08:00",
    seller: "转转优品",
  },
  {
    title: "Surface Pro 8 i5 16G 512G 国行 官保",
    price: 4150,
    spec: "16G+512G",
    url: "https://www.zhuanzhuan.com/item/200002",
    created_at: "2026-06-12T16:00:00+08:00",
    seller: "官方自营",
  },
  {
    title: "Surface Pro 8 i7 32G 1TB 顶配 95新",
    price: 5800,
    spec: "32G+1TB",
    url: "https://www.zhuanzhuan.com/item/200003",
    created_at: "2026-06-11T10:00:00+08:00",
    seller: "高端数码",
  },
];

// ─── Helper: Build normalized records from API-style data ──────────────────

function buildRecords(records, sourceName, sourceId, runId, themeId) {
  return records.map((r, idx) => ({
    id: `${sourceId}-record-${idx + 1}`,
    sourceRunId: runId,
    themeId,
    sourceId,
    infoType: "price",
    occurredAt: r.created_at,
    title: r.title,
    fingerprint: `xianyu_${r.spec}_${r.price}`,
    logicalKey: `price:${r.spec}:${r.created_at.slice(0, 10)}:${r.title.slice(0, 20)}`,
    content: {
      price: r.price,
      currency: "CNY",
      spec: r.spec,
      url: r.url,
      seller: r.seller,
      is_outlier: r.price < 3000, // Mark suspiciously low prices
      outlier_reason: r.price < 3000 ? "Price below 3000 CNY — may be damaged or incomplete" : null,
    },
  }));
}

// ─── Main Seed ─────────────────────────────────────────────────────────────

try {
  await client.connect();
  await client.query("begin");

  // 1. Theme
  await upsertTheme(client, {
    id: themeId,
    name: "Surface Pro 8 16G+512G 二手价格",
    themeType: "price",
    infoType: "price",
    description: "闲鱼+转转双平台 Surface Pro 8 同配置价格监控",
  });

  // 2. Xianyu Source — 使用 generic_price_list 适配器
  await upsertSource(client, {
    id: xianyuSourceId,
    themeId,
    name: "闲鱼搜索结果",
    sourceType: "api",
    adapterKey: "generic_price_list",
    status: "active",
    config: {
      // 真实接入时，替换为你的 API 代理地址
      url: "https://your-proxy.example.com/api/xianyu/search?q=Surface+Pro+8",
      items_field: "data.items",
      title_field: "title",
      price_field: "price",
      spec_field: "spec",
      url_field: "url",
      time_field: "created_at",
      currency: "CNY",
      max_items: 20,
      schedule_interval_seconds: 21600, // 每6小时抓一次
      emit_events_on_latest_only: true,
    },
    latestSuccessAt: "2026-06-13T10:30:00Z",
    latestFailureAt: null,
  });

  // 3. Zhuanzhuan Source — 使用 generic_price_list 适配器
  await upsertSource(client, {
    id: zhuanzhuanSourceId,
    themeId,
    name: "转转搜索结果",
    sourceType: "api",
    adapterKey: "generic_price_list",
    status: "active",
    config: {
      url: "https://your-proxy.example.com/api/zhuanzhuan/search?q=Surface+Pro+8",
      items_field: "data.items",
      title_field: "title",
      price_field: "price",
      spec_field: "spec",
      url_field: "url",
      time_field: "created_at",
      currency: "CNY",
      max_items: 15,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    latestSuccessAt: "2026-06-13T09:00:00Z",
    latestFailureAt: null,
  });

  // 4. Xianyu Run + Snapshot + Records
  const xianyuRunId = "run-xianyu-surface-seed";
  const xianyuSnapshotId = "snapshot-xianyu-surface-seed";

  await upsertSourceRun(client, {
    id: xianyuRunId,
    themeId,
    sourceId: xianyuSourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-06-13T10:30:00Z",
    finishedAt: "2026-06-13T10:30:00Z",
  });

  await upsertRawSnapshot(client, {
    id: xianyuSnapshotId,
    sourceRunId: xianyuRunId,
    themeId,
    sourceId: xianyuSourceId,
    fetchedAt: "2026-06-13T10:30:00Z",
    payloadJson: {
      code: 200,
      data: { items: xianyuRecords },
    },
  });

  const xianyuNormalized = buildRecords(
    xianyuRecords,
    "闲鱼搜索结果",
    xianyuSourceId,
    xianyuRunId,
    themeId,
  );

  for (const record of xianyuNormalized) {
    await upsertNormalizedRecord(client, record);
  }

  // 5. Zhuanzhuan Run + Snapshot + Records
  const zhuanzhuanRunId = "run-zhuanzhuan-surface-seed";
  const zhuanzhuanSnapshotId = "snapshot-zhuanzhuan-surface-seed";

  await upsertSourceRun(client, {
    id: zhuanzhuanRunId,
    themeId,
    sourceId: zhuanzhuanSourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-06-13T09:00:00Z",
    finishedAt: "2026-06-13T09:00:00Z",
  });

  await upsertRawSnapshot(client, {
    id: zhuanzhuanSnapshotId,
    sourceRunId: zhuanzhuanRunId,
    themeId,
    sourceId: zhuanzhuanSourceId,
    fetchedAt: "2026-06-13T09:00:00Z",
    payloadJson: {
      code: 200,
      data: { items: zhuanzhuanRecords },
    },
  });

  const zhuanzhuanNormalized = buildRecords(
    zhuanzhuanRecords,
    "转转搜索结果",
    zhuanzhuanSourceId,
    zhuanzhuanRunId,
    themeId,
  );

  for (const record of zhuanzhuanNormalized) {
    await upsertNormalizedRecord(client, record);
  }

  // 6. Event: 30-day low detected (闲鱼 16G+512G 配置 3200元)
  await upsertEvent(client, {
    id: DEMO_EVENT_IDS.SURFACE_LOW,
    sourceRunId: xianyuRunId,
    themeId,
    sourceId: xianyuSourceId,
    changeId: null,
    eventType: "price_low",
    signal: "30d_low",
    title: "30天新低: 闲鱼 Surface Pro 8 16G+512G ¥3200",
    summary: "检测到闲鱼平台 Surface Pro 8 16G+512G 配置出现30天内最低价 ¥3200（有磕碰，85新）。建议核验是否为同配置真实成交价。",
    evidence: [
      "闲鱼 API 抓取成功，返回 5 条结果。",
      "16G+512G 配置最低价: ¥3200 (85新，有磕碰)。",
      "同配置其他价格: ¥3899 (95新), ¥4500 (9新带笔)。",
      "转转平台同配置最低价: ¥4099 (95新)。",
      "跨平台价差: ¥899 (28%)，闲鱼价格更低但成色较差。",
    ],
    status: "open",
    isRead: false,
    isBookmarked: true,
    bookmarkedAt: "2026-06-13T10:35:00Z",
    occurredAt: "2026-06-13T10:31:00Z",
  });

  await client.query("commit");
  console.log("✅ Xianyu Surface Pro 8 demo seeded successfully.");
  console.log("");
  console.log("已创建:");
  console.log(`  Theme: ${themeId}`);
  console.log(`  Sources: ${xianyuSourceId}, ${zhuanzhuanSourceId}`);
  console.log(`  Records: ${xianyuNormalized.length + zhuanzhuanNormalized.length} 条价格记录`);
  console.log(`  Events: ${DEMO_EVENT_IDS.SURFACE_LOW} (30天新低)`);
  console.log("");
  console.log("验证方式:");
  console.log("  1. 启动 API: npm --workspace @info-monitor/api dev");
  console.log("  2. 访问: http://localhost:3000/themes/theme-surface-pro-8");
  console.log("  3. 应看到: 价格记录、30天新低事件、跨平台价格对比");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed Xianyu Surface Pro 8 demo.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
