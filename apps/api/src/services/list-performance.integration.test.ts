import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import Fastify from "fastify";
import { registerEventRoutes } from "../routes/events.js";
import { getOperationalMetrics, getSourceHealthStats } from "./source-health-service.js";
import { getWorkspaceData, getWorkspaceIndex, invalidateWorkspaceCache } from "./workspace-service.js";
import { WORKSPACE_IDS } from "@info-monitor/shared-contracts";
import { buildApp } from "../app.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "../db/schema.js";

const { getDatabase } = vi.hoisted(() => ({ getDatabase: vi.fn() }));
vi.mock("../db/client.js", () => ({ getDatabase }));
import { listThemes } from "./theme-service.js";
import { listSourceStatuses } from "./source-service.js";
import { listEventPage, listCompactEvents } from "./event-list-service.js";
import { countInboxSectionEvents, filterEventsByInboxSection, listInboxSectionEvents } from "./event-service.js";

describe.skipIf(!process.env.TEST_DATABASE_URL)("PostgreSQL list query regression", () => {
  const schema = `perf_${randomUUID().replaceAll("-", "")}`;
  let pool: pg.Pool;
  let admin: pg.Pool;
  let db: Kysely<Database>;
  let queries = 0;

  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await admin.query(`create schema ${schema}`);
    pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
    db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }), log: (event) => { if (event.level === "query") queries++; } });
    getDatabase.mockReturnValue(db);
    await pool.query(readFileSync(new URL("../../../../db/migrations/0001_initial.sql", import.meta.url), "utf8"));
    await pool.query(readFileSync(new URL("../../../../db/migrations/0005_event_status_history.sql", import.meta.url), "utf8"));
    await pool.query(readFileSync(new URL("../../../../db/migrations/0014_event_feedback.sql", import.meta.url), "utf8"));
    await pool.query(`
      alter table events add is_read boolean default false, add is_bookmarked boolean default false, add bookmarked_at timestamptz;
      insert into themes(id,name,theme_type,info_type,metadata) values
        ('t1','Populated','news_announcement','news_announcement','{"reviewNote":{"status":"reviewed","tags":["keep"]}}'),
        ('empty','Empty','news_announcement','news_announcement','{}'),
        ('other','Other','news_announcement','news_announcement','{}');
      insert into sources(id,theme_id,name,source_type,adapter_key) values
        ('s1','t1','Source one','api','rss_feed'),('s2','t1','Source two','api','rss_feed');
      update sources set latest_success_at='2026-01-02' where id='s1';
      update sources set latest_failure_at='2026-01-03' where id='s2';
      insert into source_runs(id,theme_id,source_id,trigger_type,status,created_at,finished_at) values
        ('r1','t1','s1','scheduled','completed','2026-01-01','2026-01-01'),
        ('r2','t1','s1','replay','completed','2026-01-02','2026-01-02'),
        ('test','t1','s1','test','completed','2026-01-04','2026-01-04'),
        ('r3','t1','s2','manual','failed','2026-01-03','2026-01-03');
      insert into events(id,theme_id,source_id,source_run_id,event_type,signal,title,summary,status,occurred_at,is_read,is_bookmarked,bookmarked_at) values
        ('e1','t1','s1','r1','announcement','old','Older','old','open','2026-01-01',false,true,'2026-01-02'),
        ('e2','t1','s1','r1','announcement','latest','Newest','new','tracking','2026-01-03',true,false,null),
        ('e3','t1','s2','r3','announcement','ignored','Ignored','ignored','ignored','2026-01-02',null,false,null);
      insert into normalized_records(id,theme_id,source_id,source_run_id,info_type,occurred_at,title,fingerprint,content) values
        ('n1','t1','s1','r1','news_announcement','2026-01-01','Older','old','{"description":"old"}'),
        ('n2','t1','s1','r1','news_announcement','2026-01-03','Newest','new','{"release_topic_label":"Latest topic"}');
    `);
  });

  afterAll(async () => {
    await db?.destroy();
    if (admin) { await admin.query(`drop schema if exists ${schema} cascade`); await admin.end(); }
  });

  it("preserves counts and latest values without query growth per theme", async () => {
    queries = 0;
    const themes = await listThemes();
    expect(themes).toHaveLength(3);
    expect(themes.find((t) => t.id === "t1")).toMatchObject({
      sourceCount: 2, openEventCount: 1, trackingEventCount: 1, ignoredEventCount: 1,
      unreadEventCount: 2, bookmarkedEventCount: 1, latestRunAt: "2026-01-03T00:00:00.000Z",
      latestEventTitle: "Newest", latestEventSignal: "latest", reviewStatus: "reviewed", reviewTags: ["keep"],
      latestInsight: "Latest topic", latestBookmarkedAt: "2026-01-02T00:00:00.000Z",
      latestSuccessAt: "2026-01-02T00:00:00.000Z", latestFailureAt: "2026-01-03T00:00:00.000Z", sourceHealth: "warning",
    });
    expect(themes.find((t) => t.id === "empty")).toMatchObject({ sourceCount: 0, openEventCount: 0, latestRunAt: null, latestEventTitle: null });
    expect(queries).toBeLessThanOrEqual(3);
  });

  it("batches source latest runs while excluding test and replay", async () => {
    queries = 0;
    const sources = await listSourceStatuses();
    expect(sources.find((s) => s.id === "s1")).toMatchObject({ latestRunStatus: "completed", latestRunAt: "2026-01-01T00:00:00.000Z", latestEventSignal: "latest" });
    expect(sources.find((s) => s.id === "s2")).toMatchObject({ latestRunStatus: "failed", latestRunAt: "2026-01-03T00:00:00.000Z" });
    expect(queries).toBeLessThanOrEqual(4);
  });

  it("keeps query counts bounded as more themes and sources are added", async () => {
    await pool.query(`
      insert into themes(id,name,theme_type,info_type)
        select 'extra_'||n,'Extra '||n,'news_announcement','news_announcement' from generate_series(1,25) n;
      insert into sources(id,theme_id,name,source_type,adapter_key)
        select 'extra_source_'||n,'extra_'||n,'Extra source '||n,'api','rss_feed' from generate_series(1,25) n;
    `);
    queries = 0;
    expect(await listThemes()).toHaveLength(28);
    expect(queries).toBe(3);
    queries = 0;
    const sources = await listSourceStatuses();
    expect(sources).toHaveLength(27);
    expect(sources.find((s) => s.id === "extra_source_1")).toMatchObject({ latestRunStatus: null, latestRunAt: null, latestEventSignal: null });
    expect(queries).toBeLessThanOrEqual(4);
  });

  it("pages timestamp ties at PostgreSQL precision without missing or repeating events", async () => {
    await pool.query(`insert into events(id,theme_id,source_id,source_run_id,event_type,signal,title,summary,occurred_at) values
      ('tie_a','t1','s1','r1','announcement','new_announcement','Tie A','a','2026-01-03T00:00:00.000001Z'),
      ('tie_b','t1','s1','r1','announcement','new_announcement','Tie B','b','2026-01-03T00:00:00.000002Z');`);
    const first = await listEventPage({ limit: 1 });
    const second = await listEventPage({ limit: 1, cursor: first.nextCursor! });
    expect(first.items[0].id).toBe("tie_b");
    expect(first.items[0]).toHaveProperty("feedback", null);
    expect(second.items[0].id).toBe("tie_a");
    expect(first.total).toBe(5);
    let cursor: string | null = null;
    const ids: string[] = [];
    do {
      const page = await listEventPage({ limit: 2, cursor: cursor ?? undefined });
      ids.push(...page.items.map((event) => event.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    expect((await listEventPage({ status: "tracking", limit: 1 })).items.map((e) => e.id)).toEqual(["e2"]);
    expect((await listEventPage({ q: "%", limit: 1 })).total).toBe(0);
    expect((await listEventPage({ themeId: "empty", limit: 1 })).items).toEqual([]);
  });

  it("filters status history and rejects invalid or mismatched cursors", async () => {
    await pool.query(`insert into event_status_history(id,event_id,to_status,changed_at)
      values ('h1','e1','open','2026-02-01');`);
    await pool.query("insert into event_feedback(id,event_id,feedback) values ('f1','e1','useful')");
    const page = await listEventPage({ sort: "statusChanged", since: "2026-01-15T00:00:00Z", limit: 1 });
    expect(page.items.map((e) => e.id)).toEqual(["e1"]);
    expect(page.items[0].latestStatusChangedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(page.items[0]).toHaveProperty("feedback", "useful");
    await expect(listEventPage({ cursor: "broken" })).rejects.toThrow(/cursor/i);
    const invalidDate = Buffer.from(JSON.stringify({ sort: "occurredAt", id: "e1", at: "2026-02-30T00:00:00.000000Z" })).toString("base64url");
    await expect(listEventPage({ cursor: invalidDate })).rejects.toMatchObject({ statusCode: 400 });
    const first = await listEventPage({ limit: 1 });
    await expect(listEventPage({ cursor: first.nextCursor!, sort: "bookmarkedAt" })).rejects.toThrow(/cursor/i);
  });

  it("keeps compact workspace context and aggregate section counts equivalent to full events", async () => {
    await pool.query(`update normalized_records set content='{"object_name":"Kept object","update_type":"feature_release","publisher":"Kept publisher","description":"Do not transfer this body"}' where id='n2';
      insert into changes(id,source_run_id,theme_id,source_id,normalized_record_id,change_type,summary)
      values ('c1','r1','t1','s1','n2','updated','changed');
      update events set change_id='c1' where id='e2';`);
    const full = await listInboxSectionEvents();
    const compact = await listCompactEvents();
    expect(compact).toHaveLength(full.length);
    expect(compact.find((e) => e.id === "e2")?.context).toEqual({ object_name: "Kept object", update_type: "feature_release", publisher: "Kept publisher" });
    expect(full.find((e) => e.id === "e2")?.context?.description).toBe("Do not transfer this body");
    queries = 0;
    const sections = await countInboxSectionEvents();
    expect(queries).toBe(1);
    for (const section of ["price-signals", "content-updates", "official-releases", "financial-events"] as const) {
      expect(sections[section].total).toBe(filterEventsByInboxSection(full, section).length);
      expect(sections[section].recent).toBe(0);
    }
  });

  it("validates paginated route queries and keeps full-list compatibility", async () => {
    const app = Fastify();
    await registerEventRoutes(app);
    try {
      for (const query of ["limit=0", "limit=201", "sort=wrong", "status=wrong", "since=invalid"]) {
        expect((await app.inject(`/api/events/page?${query}`)).statusCode).toBe(400);
      }
      const page = await app.inject("/api/events/page?limit=1");
      expect(page.statusCode).toBe(200);
      expect(page.json().items).toHaveLength(1);
      expect(page.json().total).toBe(5);
      expect((await app.inject("/api/events?view=compact")).json()).toHaveLength(5);
      expect((await app.inject("/api/events")).json()).toHaveLength(5);
    } finally { await app.close(); }
  });

  it("applies combined page filters and counts recent sections across all matches", async () => {
    await pool.query(`
      insert into normalized_records(id,theme_id,source_id,source_run_id,info_type,occurred_at,title,fingerprint,content) values
        ('np','t1','s1','r1','price',now(),'Price','price','{}'),
        ('nc','t1','s1','r1','content_update',now(),'Content','content','{}');
      insert into changes(id,source_run_id,theme_id,source_id,normalized_record_id,change_type,summary) values
        ('cp','r1','t1','s1','np','updated','price'),('cc','r1','t1','s1','nc','updated','content');
      insert into events(id,theme_id,source_id,source_run_id,change_id,event_type,signal,title,summary,occurred_at,is_bookmarked,bookmarked_at) values
        ('positive','t1','s1','r1','cp','price','bullish','100% Offer','positive',now(),true,now()),
        ('negative','t1','s1','r1','cp','price','bearish','Negative','negative',now(),false,null),
        ('content','t1','s1','r1','cc','content','content_update','Content','content',now(),false,null);
    `);
    expect((await listEventPage({ impact: "positive", type: "price", read: "unread", themeId: "t1,empty" })).items.map((e) => e.id)).toEqual(["positive"]);
    expect((await listEventPage({ impact: "negative" })).items.map((e) => e.id)).toEqual(["negative"]);
    expect((await listEventPage({ read: "read" })).items.map((e) => e.id)).toEqual(["e2"]);
    expect((await listEventPage({ q: "100%" })).items.map((e) => e.id)).toEqual(["positive"]);
    expect((await listEventPage({ recent: "24h" })).items).toHaveLength(3);
    const bookmarks = await listEventPage({ bookmark: "bookmarked", sort: "bookmarkedAt", limit: 1 });
    expect(bookmarks.total).toBe(2);
    expect(bookmarks.items[0].id).toBe("positive");
    const sections = await countInboxSectionEvents();
    expect(sections["price-signals"]).toEqual({ total: 2, recent: 2 });
    expect(sections["content-updates"]).toEqual({ total: 1, recent: 1 });
  });

  it("aggregates operational metrics in Shanghai time without transferring raw runs", async () => {
    await pool.query(`insert into source_runs(id,theme_id,source_id,trigger_type,status,error_message,created_at,started_at,finished_at) values
      ('m1','t1','s1','scheduled','failed','same error',now(),now()-interval '2 seconds',now()),
      ('m2','t1','s1','scheduled','failed','same error',now(),now()-interval '4 seconds',now()),
      ('m3','t1','s1','manual','completed',null,now(),now()-interval '6 seconds',now()),
      ('m4','t1','s1','scheduled','pending',null,now(),null,null),
      ('m5','t1','s1','replay','completed',null,now(),now()-interval '1 second',now()),
      ('m6','t1','s1','test','completed',null,now(),now()-interval '20 seconds',now());`);
    const metrics = await getOperationalMetrics();
    const created = (await pool.query("select created_at from source_runs where id='m1'")).rows[0].created_at as Date;
    const today = created.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    expect(metrics.runDurationTrend.find((d) => d.date === today)?.value).toBe(3250);
    expect(metrics.failureRateTrend.find((d) => d.date === today)?.value).toBe(0.4);
    const localHour = (created.getUTCHours() + 8) % 24;
    expect(metrics.hourlyDistribution[localHour]).toMatchObject({ total: 5, successful: 2, failed: 2 });
    expect(metrics.backlog.pendingRuns).toBe(1);
    expect(metrics.recentExceptions[0]).toMatchObject({ errorMessage: "same error", count: 2, sourceIds: ["s1"] });
    const health = await getSourceHealthStats();
    expect(health.recentRuns).toMatchObject({ total: 4, successful: 1, failed: 2 });
    expect(health.sourceDetails.find((s) => s.id === "s1")).toMatchObject({ runCount24h: 4, successCount24h: 1, failureCount24h: 2 });
  });

  it("partitions complete events between workspace endpoints without global leakage", async () => {
    invalidateWorkspaceCache();
    const index = await getWorkspaceIndex();
    expect(index.workspaces).toHaveLength(4);
    const ids: string[] = [];
    for (const id of WORKSPACE_IDS) {
      const workspace = await getWorkspaceData(id);
      expect(workspace.allThemes).toHaveLength(28);
      expect(workspace.allSources).toHaveLength(27);
      const themes = new Set(workspace.themes.map((theme) => theme.id));
      expect(workspace.events.every((event) => themes.has(event.themeId))).toBe(true);
      expect(workspace.sources.every((source) => themes.has(source.themeId))).toBe(true);
      ids.push(...workspace.events.map((event) => event.id));
    }
    expect(ids).toHaveLength((await listInboxSectionEvents()).length);
    expect(new Set(ids).size).toBe(ids.length);
    invalidateWorkspaceCache();
  });

  it("invalidates workspace data after successful API mutations", async () => {
    invalidateWorkspaceCache();
    const app = await buildApp();
    app.post("/api/workspace-cache-test", async () => {
      await pool.query("update themes set name='Renamed' where id='t1'");
      return { ok: true };
    });
    try {
      expect((await app.inject("/api/workspaces/market-impact")).statusCode).toBe(200);
      expect((await app.inject({ method: "POST", url: "/api/workspace-cache-test" })).statusCode).toBe(200);
      const response = await app.inject("/api/workspaces/market-impact");
      expect(response.json().allThemes.find((t: { id: string }) => t.id === "t1").name).toBe("Renamed");
    } finally { await app.close(); invalidateWorkspaceCache(); }
  });

  it("returns empty lists after all themes are removed", async () => {
    await pool.query("delete from themes");
    expect(await listThemes()).toEqual([]);
    expect(await listSourceStatuses()).toEqual([]);
  });
});
