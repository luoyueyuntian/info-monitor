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

const themeId = DEMO_THEME_IDS.STATS_CPI_RELEASES;
const sourceId = DEMO_SOURCE_IDS.STATS_CPI_RELEASE;
const runId = DEMO_RUN_IDS.STATS_DATA_RELEASE_LATEST;
const snapshotId = DEMO_SNAPSHOT_IDS.STATS_DATA_RELEASE_LATEST;
const recordId = DEMO_RECORD_IDS.STATS_DATA_RELEASE_LATEST;
const eventId = DEMO_EVENT_IDS.STATS_DATA_RELEASE_LATEST;

try {
  await client.connect();
  await client.query("begin");

  await upsertTheme(client, {
    id: themeId,
    name: "NBS CPI Releases",
    themeType: "news_announcement",
    infoType: "news_announcement",
    description: "Official CPI release list from the National Bureau of Statistics",
  });

  await upsertSource(client, {
    id: sourceId,
    themeId,
    name: "NBS CPI Release List",
    sourceType: "page_list",
    adapterKey: "stats_data_release_list",
    status: "active",
    config: {
      path: "/sj/zxfb/",
      max_items: 6,
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    latestSuccessAt: "2026-06-01T08:05:00Z",
    latestFailureAt: null,
  });

  await upsertSourceRun(client, {
    id: runId,
    themeId,
    sourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-06-01T08:02:00Z",
    finishedAt: "2026-06-01T08:05:00Z",
  });

  await upsertRawSnapshot(client, {
    id: snapshotId,
    sourceRunId: runId,
    themeId,
    sourceId,
    fetchedAt: "2026-06-01T08:02:00Z",
    payloadJson: {
      release_topic_label: "CPI",
      publisher: "国家统计局",
      category: "macro_release",
      description: "Latest CPI bulletin and attached statistical interpretation.",
    },
  });

  await upsertNormalizedRecord(client, {
    id: recordId,
    sourceRunId: runId,
    themeId,
    sourceId,
    infoType: "news_announcement",
    occurredAt: "2026-06-01T08:02:00Z",
    title: "国家统计局 CPI 发布",
    fingerprint: "stats_data_release_demo_cpi_latest",
    logicalKey: "stats-cpi-release-20260601",
    content: {
      release_topic_label: "CPI",
      publisher: "国家统计局",
      category: "macro_release",
      description: "Latest CPI bulletin and attached statistical interpretation.",
    },
  });

  await upsertEvent(client, {
    id: eventId,
    sourceRunId: runId,
    themeId,
    sourceId,
    changeId: null,
    eventType: "new_release",
    signal: "new_announcement",
    title: "NBS published latest CPI release",
    summary: "A new CPI release was published on the National Bureau of Statistics site.",
    evidence: [
      "NBS release list fetched successfully.",
      "Latest CPI bulletin normalized into a release record.",
      "Announcement event emitted from the newest release item.",
    ],
    status: "open",
    isRead: false,
    isBookmarked: false,
    bookmarkedAt: null,
    occurredAt: "2026-06-01T08:02:00Z",
  });

  await client.query("commit");
  console.log("NBS CPI release demo theme, source, record, and event seeded.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed NBS data release demo.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
