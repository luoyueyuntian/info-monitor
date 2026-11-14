import { createHash } from 'node:crypto';
import { sql } from 'kysely';
import type { NewsArticle } from '@info-monitor/shared-contracts';
import { getDatabase } from '../db/client.js';

type ArticleRecord = { infoType: string | null; context: unknown };

export function articleSource(row: ArticleRecord): { url: string | null; reason: string | null } {
  if (row.infoType !== 'news_announcement') return { url: null, reason: '此事件属于结构化数据，未提供网页新闻正文。' };
  const raw = row.context && typeof row.context === 'object' ? (row.context as Record<string, unknown>).url : null;
  if (typeof raw !== 'string' || !raw.trim()) return { url: null, reason: '此事件未保存原文链接，暂时无法读取正文。' };
  const url = raw.trim().split('#', 1)[0];
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
      (parsed.port && !['80', '443'].includes(parsed.port)) || url.length > 8192) throw new Error('unsupported');
    if (parsed.pathname.toLowerCase().endsWith('.pdf')) return {
      url, reason: '这条公告的原文是 PDF 文件，可通过上方“打开公告 PDF”阅读。当前站内正文提取仅支持网页新闻。',
    };
    return { url, reason: null };
  } catch { return { url: null, reason: '原文链接格式不受支持，暂时无法读取正文。' }; }
}

export function articleTarget(row: ArticleRecord) {
  const source = articleSource(row);
  return source.url && !source.reason ? { url: source.url, id: createHash('sha256').update(source.url).digest('hex') } : null;
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
  if (!target) {
    const source = articleSource(event);
    return { status: 'unsupported', url: source.url, title: event.title, contentText: null, fetchedAt: null, errorMessage: source.reason, retryAvailableAt: null };
  }
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
