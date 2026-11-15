import { afterAll,beforeAll,describe,expect,it,vi } from 'vitest';
import { readFileSync,readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { Kysely,PostgresDialect } from 'kysely';
import Fastify from 'fastify';
import type { Database } from '../db/schema.js';
const { getDatabase }=vi.hoisted(()=>({getDatabase:vi.fn()}));
vi.mock('../db/client.js',()=>({getDatabase}));
import { registerContentRoutes } from '../routes/content.js';
import { getContentDetail,listContent } from './content-service.js';
import { getRecordArticle } from './article-service.js';

describe.skipIf(!process.env.TEST_DATABASE_URL)('collected content independent of events',()=>{
  const schema='content_'+randomUUID().replaceAll('-','');
  let admin:pg.Pool,pool:pg.Pool,db:Kysely<Database>;
  const app=Fastify();
  beforeAll(async()=>{
    admin=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
    await admin.query(`create schema ${schema}`);
    pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-csearch_path=${schema}`});
    db=new Kysely<Database>({dialect:new PostgresDialect({pool})}); getDatabase.mockReturnValue(db);
    const dir=new URL('../../../../db/migrations/',import.meta.url);
    for(const f of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()) await pool.query(readFileSync(new URL(f,dir),'utf8'));
    await pool.query(`
      insert into themes(id,name,theme_type,info_type) values ('t','Policy','financial_event','financial_event'),('other','Other','price','price');
      insert into sources(id,theme_id,name,source_type,adapter_key) values ('s','t','Policy Source','html','csrc_announcements'),('s2','t','Other source','rss','rss_feed'),('s3','other','Prices','api','sina_stock_price');
      insert into source_runs(id,theme_id,source_id,trigger_type,status) values ('r','t','s','manual','completed');
      insert into normalized_records(id,theme_id,source_id,source_run_id,info_type,occurred_at,title,fingerprint,content)
      select 'n'||i,'t','s','r','financial_event','2026-11-15'::timestamptz,'Policy '||i,'f'||i,jsonb_build_object('url','https://example.com/'||i,'description','Summary') from generate_series(1,55)i;
      insert into normalized_records(id,theme_id,source_id,source_run_id,info_type,occurred_at,title,fingerprint,content) values
      ('pdf','t','s2','r','news_announcement',now(),'PDF release','pdf','{"url":"https://example.com/report.PDF"}'),
      ('price','other','s3','r','price',now(),'Price record','price','{"url":"https://example.com/quote","price":100}'),
      ('update','t','s2','r','content_update',now(),'Product update','update','{"url":"https://example.com/release"}');
    `);
    await registerContentRoutes(app);
  });
  afterAll(async()=>{await app.close();await db?.destroy();if(admin){await admin.query(`drop schema if exists ${schema} cascade`);await admin.end();}});
  it('lists all records without events, filters exactly and paginates deterministically',async()=>{
    const first=await listContent({sourceId:'s',page:1,limit:20});
    const second=await listContent({sourceId:'s',page:2,limit:20});
    expect(first.total).toBe(55);expect(first.items).toHaveLength(20);
    expect(new Set([...first.items,...second.items].map(r=>r.id)).size).toBe(40);
    expect(first.items[0]).toMatchObject({sourceName:'Policy Source',themeName:'Policy',articleStatus:'not_requested'});
    expect(first.items[0]).not.toHaveProperty('content');expect(first.items[0]).not.toHaveProperty('contentText');
    expect((await listContent({sourceId:'s',themeId:'other'})).total).toBe(0);
    expect((await listContent({themeId:'t',q:'Policy 55'})).items.map(r=>r.id)).toEqual(['n55']);
    expect((await listContent({themeId:'t'})).items.find(r=>r.id==='pdf')?.articleStatus).toBe('pdf');
  });
  it('reads records and queues original without an event, including policy and product updates',async()=>{
    expect(await getContentDetail('n1')).toMatchObject({title:'Policy 1',context:{description:'Summary'}});
    expect(await getContentDetail('missing')).toBeNull();
    expect(await getRecordArticle('n1',{request:true})).toMatchObject({status:'pending',url:'https://example.com/1'});
    expect(await getRecordArticle('update',{request:true})).toMatchObject({status:'pending'});
    expect(await getRecordArticle('pdf',{request:true})).toMatchObject({status:'unsupported',url:'https://example.com/report.PDF'});
    expect(await getRecordArticle('price',{request:true})).toMatchObject({status:'unsupported'});
    expect((await pool.query('select count(*) from news_articles')).rows[0].count).toBe('2');
  });
  it('does not queue shared financial observation pages as historical originals',async()=>{
    for(const eventClass of ['yield_curve','daily_billboard','market_overview']) {
      await pool.query(`update normalized_records set content=jsonb_build_object('url','https://example.com/rolling','event_class',$1::text) where id='n2'`,[eventClass]);
      expect(await getRecordArticle('n2',{request:true})).toMatchObject({status:'unsupported'});
      expect(await getContentDetail('n2')).toMatchObject({articleStatus:'data_only',sourceUrl:'https://example.com/rolling'});
    }
    expect((await pool.query("select count(*) from news_articles where url='https://example.com/rolling'")).rows[0].count).toBe('0');
  });
  it('validates scope and page bounds and returns missing record 404',async()=>{
    expect((await app.inject('/api/content')).statusCode).toBe(400);
    expect((await app.inject('/api/content?sourceId=s&limit=10000')).statusCode).toBe(400);
    expect((await app.inject('/api/content?sourceId=s&page=-1')).statusCode).toBe(400);
    expect((await app.inject('/api/content/missing')).statusCode).toBe(404);
    expect((await app.inject({method:'POST',url:'/api/content/missing/article',payload:{}})).statusCode).toBe(404);
  });
});
