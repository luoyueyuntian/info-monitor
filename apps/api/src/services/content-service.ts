import type { CollectedContentItem,CollectedContentDetail,CollectedContentPage } from '@info-monitor/shared-contracts';
import { sql } from 'kysely';
import { getDatabase } from '../db/client.js';
import { articleSource,articleTarget,isStructuredContent } from './article-service.js';

export type ContentQuery = { sourceId?: string; themeId?: string; page?: number; limit?: number; q?: string };
function baseQuery() {
  return getDatabase().selectFrom('normalized_records as nr')
    .innerJoin('sources as s','s.id','nr.source_id').innerJoin('themes as t','t.id','nr.theme_id');
}
function scope(query: ReturnType<typeof baseQuery>, filters: ContentQuery) {
  if (!filters.sourceId && !filters.themeId) throw new Error('sourceId or themeId is required');
  if(filters.sourceId) query=query.where('nr.source_id','=',filters.sourceId);
  if(filters.themeId) query=query.where('nr.theme_id','=',filters.themeId);
  if(filters.q?.trim()) query=query.where('nr.title','ilike',`%${filters.q.trim().replace(/[\\%_]/g,'\\$&')}%`);
  return query;
}
const fields = ['nr.id as id','nr.title as title','nr.theme_id as themeId','t.name as themeName','nr.source_id as sourceId','s.name as sourceName','nr.info_type as infoType','nr.occurred_at as occurredAt','nr.content as context'] as const;
async function present(rows: Array<{id:string;title:string;themeId:string;themeName:string;sourceId:string;sourceName:string;infoType:string;occurredAt:Date;context:Record<string,unknown>}>): Promise<CollectedContentItem[]> {
  const targets=rows.map(row=>articleTarget(row));
  const ids=targets.flatMap(target=>target ? [target.id] : []);
  const articles=ids.length ? await getDatabase().selectFrom('news_articles').select(['id','status']).where('id','in',ids).execute() : [];
  const statuses=new Map(articles.map(a=>[a.id,a.status]));
  return rows.map((row,i)=>{
    const source=articleSource(row);
    let articleStatus: CollectedContentItem['articleStatus'];
    if(targets[i]) articleStatus=statuses.get(targets[i]!.id) ?? 'not_requested';
    else if(source.url && new URL(source.url).pathname.toLowerCase().endsWith('.pdf')) articleStatus='pdf';
    else if(isStructuredContent(row)) articleStatus='data_only';
    else articleStatus='no_link';
    // Price records still expose their actual quote source; never fetch them as an article.
    let sourceUrl=source.url;
    if(!sourceUrl && typeof row.context.url==='string') {
      try { const url=new URL(row.context.url);if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password) sourceUrl=url.href; } catch { /* invalid origin */ }
    }
    return {id:row.id,title:row.title,themeId:row.themeId,themeName:row.themeName,sourceId:row.sourceId,sourceName:row.sourceName,infoType:row.infoType,occurredAt:row.occurredAt.toISOString(),sourceUrl,articleStatus};
  });
}
export async function listContent(filters: ContentQuery): Promise<CollectedContentPage> {
  const page=Math.max(1,filters.page??1),limit=Math.min(50,Math.max(1,filters.limit??20));
  const query=scope(baseQuery(),filters);
  const [rows,count]=await Promise.all([
    query.select(fields.filter(field=>field!=='nr.content as context'))
      .select(sql<Record<string,unknown>>`jsonb_build_object('url',nr.content->'url','event_class',nr.content->'event_class')`.as('context'))
      .orderBy('nr.occurred_at','desc').orderBy('nr.id','desc').offset((page-1)*limit).limit(limit).execute(),
    query.select(({fn})=>fn.countAll<string>().as('total')).executeTakeFirstOrThrow(),
  ]);
  return {items:await present(rows),total:Number(count.total),page,limit};
}
export async function getContentDetail(recordId:string): Promise<CollectedContentDetail|null> {
  const row=await baseQuery().select(fields).where('nr.id','=',recordId).executeTakeFirst();
  return row ? {...(await present([row]))[0],context:row.context} : null;
}
