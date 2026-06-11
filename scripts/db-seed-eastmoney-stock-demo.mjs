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

const themeId = "theme_eastmoney_moutai_demo";
const sourceId = "source_eastmoney_moutai_kline";
const runId = "run_eastmoney_moutai_demo_seed";
const snapshotId = "snapshot_eastmoney_moutai_demo_seed";
const recordId = "record_eastmoney_moutai_demo_seed";

try {
  await client.connect();
  await client.query("begin");

  await upsertTheme(client, {
    id: themeId,
    name: "Kweichow Moutai Daily Price",
    themeType: "price",
    infoType: "price",
    description: "Real-source daily price theme backed by Eastmoney kline data",
  });

  await upsertSource(client, {
    id: sourceId,
    themeId,
    name: "Eastmoney Kline: 600519",
    sourceType: "api",
    adapterKey: "eastmoney_stock_kline",
    status: "active",
    config: {
      secid: "1.600519",
      days: 45,
      schedule_interval_seconds: 86400,
      emit_events_on_latest_only: true,
    },
    latestSuccessAt: "2026-05-31T15:00:00Z",
    latestFailureAt: null,
  });

  await upsertSourceRun(client, {
    id: runId,
    themeId,
    sourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-05-31T15:00:00Z",
    finishedAt: "2026-05-31T15:00:00Z",
  });

  await upsertRawSnapshot(client, {
    id: snapshotId,
    sourceRunId: runId,
    themeId,
    sourceId,
    fetchedAt: "2026-05-31T15:00:00Z",
    payloadJson: [
      {
        title: "Kweichow Moutai Daily Close",
        occurred_at: "2026-05-31T15:00:00Z",
        price: 1728.52,
        currency: "CNY",
        symbol: "600519",
        url: "https://quote.eastmoney.com/sh600519.html",
      },
    ],
  });

  await upsertNormalizedRecord(client, {
    id: recordId,
    sourceRunId: runId,
    themeId,
    sourceId,
    infoType: "price",
    occurredAt: "2026-05-31T15:00:00Z",
    title: "Kweichow Moutai Daily Close",
    fingerprint: "eastmoney_moutai_daily_close_20260531",
    logicalKey: "eastmoney-moutai-600519",
    content: {
      price: 1728.52,
      currency: "CNY",
      symbol: "600519",
      url: "https://quote.eastmoney.com/sh600519.html",
    },
  });

  await client.query("commit");
  console.log("Eastmoney stock demo theme, source, and baseline price record seeded.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed Eastmoney stock demo.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
