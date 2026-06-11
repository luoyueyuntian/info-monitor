import dotenv from "dotenv";
import pg from "pg";

import {
  upsertNormalizedRecord,
  upsertRawSnapshot,
  upsertSource,
  upsertSourceRun,
  upsertTheme,
} from "./lib/db-seed-helpers.mjs";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

const themeId = "theme_surface_pro_8_demo";
const sourceId = "source_surface_pro_8_demo_feed";
const baselineRunId = "run_surface_pro_8_baseline";
const baselineSnapshotId = "snapshot_surface_pro_8_baseline";
const baselineRecordId = "record_surface_pro_8_baseline";

try {
  await client.connect();
  await client.query("begin");

  await upsertTheme(client, {
    id: themeId,
    name: "Surface Pro 8 16G + 512G Price",
    themeType: "price",
    infoType: "price",
    description: "Demo price-monitoring theme seeded for local development",
  });

  await upsertSource(client, {
    id: sourceId,
    themeId,
    name: "Surface Pro 8 Demo Feed",
    sourceType: "page_list",
    adapterKey: "demo_price_feed",
    status: "active",
    config: {
      file_path: "apps/python-worker/examples/surface-pro-8-price-feed.json",
      schedule_interval_seconds: 60,
    },
    latestSuccessAt: "2026-05-28T09:30:00Z",
    latestFailureAt: null,
  });

  await upsertSourceRun(client, {
    id: baselineRunId,
    themeId,
    sourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-05-28T09:30:00Z",
    finishedAt: "2026-05-28T09:30:00Z",
  });

  await upsertRawSnapshot(client, {
    id: baselineSnapshotId,
    sourceRunId: baselineRunId,
    themeId,
    sourceId,
    fetchedAt: "2026-05-28T09:30:00Z",
    payloadJson: [
      {
        title: "Surface Pro 8 16G + 512G - baseline",
        occurred_at: "2026-05-28T09:30:00Z",
        price: 4100,
        currency: "CNY",
        spec: "16G+512G",
        url: "https://example.com/xianyu/surface-pro-8-baseline",
      },
    ],
  });

  await upsertNormalizedRecord(client, {
    id: baselineRecordId,
    sourceRunId: baselineRunId,
    themeId,
    sourceId,
    infoType: "price",
    occurredAt: "2026-05-28T09:30:00Z",
    title: "Surface Pro 8 16G + 512G - baseline",
    fingerprint: "baseline_surface_pro_8_price_16g_512g",
    logicalKey: "surface-pro-8-16g-512g",
    content: {
      price: 4100,
      currency: "CNY",
      spec: "16G+512G",
      url: "https://example.com/xianyu/surface-pro-8-baseline",
    },
  });

  await client.query("commit");
  console.log("Demo theme, source, and baseline price record seeded.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed demo data.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
