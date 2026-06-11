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

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

const themeId = "theme_pbc_news_demo";
const sourceId = "source_pbc_news_list_demo";
const runId = "run_pbc_news_demo_latest";
const snapshotId = "snapshot_pbc_news_demo_latest";
const recordId = "record_pbc_news_demo_latest";
const eventId = "event_pbc_news_demo_latest";

try {
  await client.connect();
  await client.query("begin");

  await upsertTheme(client, {
    id: themeId,
    name: "PBOC News Releases",
    themeType: "news_announcement",
    infoType: "news_announcement",
    description: "Official PBOC news and release list for investment information tracking",
  });

  await upsertSource(client, {
    id: sourceId,
    themeId,
    name: "PBOC News List",
    sourceType: "page_list",
    adapterKey: "pbc_news_list",
    status: "active",
    config: {
      path: "/goutongjiaoliu/113456/113469/index.html",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    latestSuccessAt: "2026-06-01T07:40:00Z",
    latestFailureAt: null,
  });

  await upsertSourceRun(client, {
    id: runId,
    themeId,
    sourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-06-01T07:38:00Z",
    finishedAt: "2026-06-01T07:40:00Z",
  });

  await upsertRawSnapshot(client, {
    id: snapshotId,
    sourceRunId: runId,
    themeId,
    sourceId,
    fetchedAt: "2026-06-01T07:38:00Z",
    payloadJson: {
      release_topic_label: "货币政策执行报告",
      publisher: "中国人民银行",
      category: "news_announcement",
      description: "Latest monetary policy report and supporting interpretation.",
    },
  });

  await upsertNormalizedRecord(client, {
    id: recordId,
    sourceRunId: runId,
    themeId,
    sourceId,
    infoType: "news_announcement",
    occurredAt: "2026-06-01T07:38:00Z",
    title: "人民银行发布最新货币政策执行报告",
    fingerprint: "pbc_news_demo_latest_report",
    logicalKey: "pbc-news-report-20260601",
    content: {
      release_topic_label: "货币政策执行报告",
      publisher: "中国人民银行",
      category: "news_announcement",
      description: "Latest monetary policy report and supporting interpretation.",
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
    title: "PBOC published latest policy report",
    summary: "A new monetary policy report was published on the PBOC news list.",
    evidence: [
      "PBOC news list fetched successfully.",
      "Latest report normalized into a release record.",
      "Announcement event emitted from the newest release item.",
    ],
    status: "open",
    isRead: false,
    isBookmarked: false,
    bookmarkedAt: null,
    occurredAt: "2026-06-01T07:38:00Z",
  });

  await client.query("commit");
  console.log("PBOC news demo theme, source, record, and event seeded.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed PBOC news demo.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
