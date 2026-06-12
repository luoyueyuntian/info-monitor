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

const themeId = DEMO_THEME_IDS.FIGMA_UPDATES;
const sourceId = DEMO_SOURCE_IDS.FIGMA_RELEASE_NOTES;
const runId = DEMO_RUN_IDS.FIGMA_RELEASE_LATEST;
const snapshotId = DEMO_SNAPSHOT_IDS.FIGMA_RELEASE_LATEST;
const recordId = DEMO_RECORD_IDS.FIGMA_RELEASE_LATEST;
const eventId = DEMO_EVENT_IDS.FIGMA_RELEASE;

try {
  await client.connect();
  await client.query("begin");

  await upsertTheme(client, {
    id: themeId,
    name: "Figma Product Updates",
    themeType: "content_update",
    infoType: "content_update",
    description: "Figma official release notes monitoring",
  });

  await upsertSource(client, {
    id: sourceId,
    themeId,
    name: "Figma Release Notes",
    sourceType: "page_list",
    adapterKey: "generic_content_update_list",
    status: "active",
    config: {
      url: "https://www.figma.com/release-notes/",
      item_selector: "article",
      title_selector: "h2, h3, a",
      link_selector: "a",
      time_selector: "time",
      update_type: "feature_release",
      schedule_interval_seconds: 21600,
      emit_events_on_latest_only: true,
    },
    latestSuccessAt: "2026-06-01T07:30:00Z",
    latestFailureAt: null,
  });

  await upsertSourceRun(client, {
    id: runId,
    themeId,
    sourceId,
    triggerType: "seed",
    status: "completed",
    startedAt: "2026-06-01T07:30:00Z",
    finishedAt: "2026-06-01T07:30:00Z",
  });

  await upsertRawSnapshot(client, {
    id: snapshotId,
    sourceRunId: runId,
    themeId,
    sourceId,
    fetchedAt: "2026-06-01T07:30:00Z",
    payloadJson: {
      object_name: "Figma",
      update_type: "feature_release",
      url: "https://www.figma.com/release-notes/",
      summary: "New dev mode improvements announced in the latest release notes.",
    },
  });

  await upsertNormalizedRecord(client, {
    id: recordId,
    sourceRunId: runId,
    themeId,
    sourceId,
    infoType: "content_update",
    occurredAt: "2026-06-01T07:30:00Z",
    title: "Figma released a new dev mode update",
    fingerprint: "figma_demo_latest_release",
    logicalKey: "figma-release-20260601",
    content: {
      object_name: "Figma",
      update_type: "feature_release",
      url: "https://www.figma.com/release-notes/",
      summary: "New dev mode improvements announced in the latest release notes.",
    },
  });

  await upsertEvent(client, {
    id: eventId,
    sourceRunId: runId,
    themeId,
    sourceId,
    changeId: null,
    eventType: "content_update",
    signal: "content_update",
    title: "Figma released a new dev mode update",
    summary: "A new product update was detected on the Figma release notes page.",
    evidence: [
      "Release notes list page fetched successfully.",
      "Latest update card normalized into content_update format.",
      "New release event emitted for latest content update.",
    ],
    status: "open",
    isRead: false,
    isBookmarked: false,
    bookmarkedAt: null,
    occurredAt: "2026-06-01T07:35:00Z",
  });

  await client.query("commit");
  console.log("Figma demo theme, source, record, and event seeded.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed Figma demo.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
