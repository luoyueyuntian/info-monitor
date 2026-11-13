import { createHash } from 'node:crypto';
import { sql } from 'kysely';
import type { NewsArticle } from '@info-monitor/shared-contracts';
import { getDatabase } from '../db/client.js';

export function articleTarget(row: { infoType: string | null; context: unknown }) {
  if (row.infoType !== 'news_announcement' || !row.context || typeof row.context !== 'object') return null;
  const raw = (row.context as Record<string, unknown>).url;
  if (typeof raw !== 'string') return null;
  const url = raw.trim().split('#', 1)[0];
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
      (parsed.port && !['80', '443'].includes(parsed.port)) || url.length > 8192 || parsed.pathname.toLowerCase().endsWith('.pdf')) return null;
    return { url, id: createHash('sha256').update(url).digest('hex') };
  } catch { return null; }
}

/** Reads cache / enqueues work only. Never fetch an external page in an HTTP request. */
export async function getEventArticle(eventId: string, options: { request?: boolean; retry?: boolean } = {}): Promise<NewsArticle | null> {
  const db = getDatabase();
  const event = await db.selectFrom('events as e')
    .leftJoin('changes as c', 'c.id', 'e.change_id')
    .leftJoin('normalized_records as nr', 'nr.id', 'c.normalized_record_id')
    .select(['e.title', 'nr.info_type as infoType', 'nr.content as context'])
    .where('e.id', '=', eventId).executeTakeFirst();
  if (!event) return null;
  const target = articleTarget(event);
  if (!target) return { status: 'unsupported', url: null, title: event.title, contentText: null, fetchedAt: null, errorMessage: '此事件没有可读取的网页新闻链接；PDF 公告请打开原始来源。', retryAvailableAt: null };
  if (options.request) {
    await sql`insert into news_articles(id,url,title,requested_at) values (${target.id},${target.url},${event.title},now())
      on conflict (id) do update set
        requested_at=case when news_articles.status='failed' and ${Boolean(options.retry)} and news_articles.updated_at<now()-interval '60 seconds' then now() when news_articles.status='pending' then coalesce(news_articles.requested_at,now()) else news_articles.requested_at end,
        status=case when news_articles.status='failed' and ${Boolean(options.retry)} and news_articles.updated_at<now()-interval '60 seconds' then 'pending' else news_articles.status end,
        attempt_count=case when news_articles.status='failed' and ${Boolean(options.retry)} and news_articles.updated_at<now()-interval '60 seconds' then 0 else news_articles.attempt_count end,
        error_message=case when news_articles.status='failed' and ${Boolean(options.retry)} and news_articles.updated_at<now()-interval '60 seconds' then null else news_articles.error_message end,
        updated_at=case when news_articles.status='failed' and ${Boolean(options.retry)} and news_articles.updated_at<now()-interval '60 seconds' then now() else news_articles.updated_at end`.execute(db);
  }
  const article = await db.selectFrom('news_articles').select(['status','title','content_text','fetched_at','error_message','updated_at'])
    .where('id', '=', target.id).executeTakeFirst();
  return {
    url: target.url, title: article?.title || event.title,
    status: article?.status ?? 'not_requested',
    contentText: article?.status === 'ready' ? article.content_text : null,
    fetchedAt: article?.fetched_at ? new Date(article.fetched_at).toISOString() : null,
    errorMessage: article?.error_message ?? null,
    retryAvailableAt: article?.status === 'failed' ? new Date(new Date(article.updated_at).getTime() + 60_000).toISOString() : null,
  };
}
