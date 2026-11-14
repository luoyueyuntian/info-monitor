import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import Fastify from 'fastify';
import type { Database } from '../db/schema.js';
import { registerEventRoutes } from '../routes/events.js';
const { getDatabase } = vi.hoisted(() => ({ getDatabase: vi.fn() }));
vi.mock('../db/client.js', () => ({ getDatabase }));
import { articleSource, articleTarget, getEventArticle } from './article-service.js';

describe('article target', () => {
  it('uses stored news URL and ignores fragments', () => {
    expect(articleTarget({ infoType: 'news_announcement', context: { url: ' https://example.com/a#b ' } })).toMatchObject({ url: 'https://example.com/a' });
    expect(articleTarget({ infoType: 'price', context: { url: 'https://example.com/a' } })).toBeNull();
  });
  it.each(['javascript:alert(1)', 'file:///etc/passwd', 'https://u:p@example.com', 'https://example.com/a.pdf', 'https://example.com:22/a'])('rejects unsupported link %s', (url) => {
    expect(articleTarget({ infoType: 'news_announcement', context: { url } })).toBeNull();
  });
});

describe('unsupported article reasons', () => {
  it('retains PDF source link and explains format rather than missing data', () => {
    expect(articleSource({ infoType:'news_announcement', context:{url:'https://example.com/a.PDF?x=1'} })).toMatchObject({url:'https://example.com/a.PDF?x=1',reason:expect.stringContaining('PDF')});
  });
  it('distinguishes missing and invalid links from PDF', () => {
    expect(articleSource({ infoType:'news_announcement', context:{} })).toMatchObject({url:null,reason:expect.stringContaining('未保存')});
    expect(articleSource({ infoType:'news_announcement', context:{url:'javascript:alert(1)'} })).toMatchObject({url:null,reason:expect.stringContaining('链接格式')});
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)('article PostgreSQL / routes', () => {
  const schema = 'article_' + randomUUID().replaceAll('-', '');
  let admin: pg.Pool, pool: pg.Pool, db: Kysely<Database>;
  const app = Fastify();
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await admin.query(`create schema ${schema}`);
    pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-csearch_path=${schema}` });
    db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
    getDatabase.mockReturnValue(db);
    const dir = new URL('../../../../db/migrations/', import.meta.url);
    for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) await pool.query(readFileSync(new URL(file, dir), 'utf8'));
    await pool.query(`
      insert into themes(id,name,theme_type,info_type) values ('t','News','news_announcement','news_announcement');
      insert into sources(id,theme_id,name,source_type,adapter_key) values ('s','t','RSS','rss','rss_feed');
      insert into source_runs(id,theme_id,source_id,trigger_type,status) values ('r','t','s','manual','completed');
      insert into normalized_records(id,theme_id,source_id,source_run_id,info_type,occurred_at,title,fingerprint,content) values
        ('n','t','s','r','news_announcement',now(),'新闻','f','{"url":"https://example.com/news#part","description":"短摘要"}');
      insert into changes(id,source_run_id,theme_id,source_id,normalized_record_id,change_key,change_type,summary) values ('c','r','t','s','n','ck','new','新新闻');
      insert into events(id,theme_id,source_id,source_run_id,change_id,event_type,signal,title,summary,occurred_at) values ('e','t','s','r','c','news_announcement','new_announcement','新闻','短摘要',now());
    `);
    await registerEventRoutes(app);
  });
  afterAll(async () => {
    await app.close(); await db?.destroy();
    if (admin) { await admin.query(`drop schema if exists ${schema} cascade`); await admin.end(); }
  });
  it('returns absent state without enqueue; POST derives URL and queues exactly once', async () => {
    expect(await getEventArticle('missing')).toBeNull();
    expect(await getEventArticle('e')).toMatchObject({ status: 'not_requested', contentText: null });
    expect((await app.inject({ method:'POST',url:'/api/events/e/article',payload:{ url:'http://127.0.0.1' } })).json()).toMatchObject({ url:'https://example.com/news' });
    for (let i=0;i<2;i++) {
      const result = await app.inject({ method:'POST',url:'/api/events/e/article',payload:{} });
      expect(result.statusCode).toBe(200);
      expect(result.json()).toMatchObject({ status:'pending',url:'https://example.com/news',contentText:null });
    }
    expect((await pool.query('select count(*) from news_articles')).rows[0].count).toBe('1');
  });
  it('serves cached original and keeps summary separate', async () => {
    await pool.query("update news_articles set status='ready',content_text='完整原文',fetched_at=now()");
    expect(await getEventArticle('e', { request:true })).toMatchObject({ status:'ready',contentText:'完整原文' });
    expect((await pool.query('select content from normalized_records')).rows[0].content.description).toBe('短摘要');
  });
  it('requires explicit retry and observes cooldown', async () => {
    await pool.query("update news_articles set status='failed',content_text=null,error_message='失败',attempt_count=3,requested_at=null,updated_at=now()");
    expect(await getEventArticle('e', { request:true, retry:true })).toMatchObject({ status:'failed' });
    await pool.query("update news_articles set updated_at=now()-interval '2 minutes'");
    expect(await getEventArticle('e', { request:true })).toMatchObject({ status:'failed' });
    expect(await getEventArticle('e', { request:true, retry:true })).toMatchObject({ status:'pending' });
    const queued = (await pool.query('select attempt_count,requested_at from news_articles')).rows[0];
    expect(queued.attempt_count).toBe(0);
    expect(queued.requested_at).not.toBeNull();
  });  it('returns a PDF link without queueing and distinguishes records without links', async () => {
    const before = (await pool.query('select count(*) from news_articles')).rows[0].count;
    await pool.query(`update normalized_records set content='{"url":"https://example.com/report.PDF"}' where id='n'`);
    const result = await app.inject({ method:'POST',url:'/api/events/e/article',payload:{} });
    expect(result.json()).toMatchObject({status:'unsupported',url:'https://example.com/report.PDF',errorMessage:expect.stringContaining('PDF 文件')});
    expect((await pool.query('select count(*) from news_articles')).rows[0].count).toBe(before);
    await pool.query(`update normalized_records set content='{}' where id='n'`);
    expect(await getEventArticle('e')).toMatchObject({status:'unsupported',url:null,errorMessage:expect.stringContaining('未保存')});
  });

});
