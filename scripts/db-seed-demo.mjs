import dotenv from "dotenv";
import pg from "pg";

import {
  upsertNormalizedRecord,
  upsertRawSnapshot,
  upsertSource,
  upsertSourceRun,
  upsertTheme,
} from "./lib/db-seed-helpers.mjs";
import {
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
const sourceId = DEMO_SOURCE_IDS.ZHUANZHUAN_SURFACE;
const runId = DEMO_RUN_IDS.SURFACE_BASELINE;
const snapshotId = DEMO_SNAPSHOT_IDS.SURFACE_BASELINE;
const recordId = DEMO_RECORD_IDS.SURFACE_BASELINE;

try {
  await client.connect();
  await client.query("begin");

  await upsertTheme(client, {
    id: themeId,
    name: "Surface Pro 8 16G + 512G Price",
    themeType: "price",
    infoType: "price",
    description: "Cross-marketplace price monitor for Surface Pro 8 16G + 512G",
  });

  await upsertSource(client, {
    id: sourceId,
    themeId,
    name: "Zhuanzhuan Search Results",
    sourceType: "page_list",
    adapterKey: "demo_price_feed",
    status: "active",
    config: {
      schedule_interval_seconds: 3600,
      emit_events_on_latest_only: true,
    },
    latestSuccessAt: "2026-06-01T09:24:00Z",
    latestFailureAt: null,
  });

  await upsertSourceRun(client, {
    id: runId,
    themeId,
    sourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-06-01T09:24:00Z",
    finishedAt: "2026-06-01T09:24:00Z",
  });

  await upsertRawSnapshot(client, {
    id: snapshotId,
    sourceRunId: runId,
    themeId,
    sourceId,
    fetchedAt: "2026-06-01T09:24:00Z",
    payloadJson: [
      {
        title: "Surface Pro 8 16G+512G",
        price: 4100,
        currency: "CNY",
        url: "https://www.zhuanzhuan.com/",
      },
    ],
  });

  await upsertNormalizedRecord(client, {
    id: recordId,
    sourceRunId: runId,
    themeId,
    sourceId,
    infoType: "price",
    occurredAt: "2026-06-01T09:24:00Z",
    title: "Surface Pro 8 16G+512G",
    fingerprint: "zhuanzhuan_surface_pro8_16g512g_20260601",
    logicalKey: "zhuanzhuan-surface-pro8-16g512g",
    content: {
      price: 4100,
      currency: "CNY",
      spec: "16G+512G",
      url: "https://www.zhuanzhuan.com/",
    },
  });

  await client.query("commit");
  console.log("Surface Pro 8 demo theme, source, and baseline price record seeded.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed Surface Pro 8 demo.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
