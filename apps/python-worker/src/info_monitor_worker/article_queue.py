"""One dedicated article consumer; all network/parse work happens outside transactions."""
from __future__ import annotations

from hashlib import sha256
import json
import logging
import subprocess
import sys
from threading import Event, Thread
from uuid import uuid4
from urllib.parse import urlsplit

from sqlalchemy import text

logger = logging.getLogger(__name__)


def enqueue_article(connection, url: str, title: str = '') -> None:
    url = url.strip().split('#', 1)[0]
    try:
        parsed = urlsplit(url)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password or len(url) > 8192 or parsed.path.lower().endswith('.pdf'):
            return
    except ValueError:
        return
    connection.execute(text('''insert into news_articles(id,url,title) values (:id,:url,:title)
        on conflict (id) do nothing'''), {'id': sha256(url.encode()).hexdigest(), 'url': url, 'title': title[:1000]})


def claim_article(connection):
    connection.execute(text('''update news_articles set status='failed', error_message='原文任务多次超时，请重试',
        claim_token=null,lease_expires_at=null,updated_at=now()
        where status='running' and lease_expires_at<now() and attempt_count>=3'''))
    return connection.execute(text('''with candidate as (
        select id from news_articles where (status='pending' or (status='running' and lease_expires_at<now()))
          and attempt_count<3
        order by requested_at desc nulls last, created_at, id for update skip locked limit 1
    ) update news_articles a set status='running',claim_token=:token,
        lease_expires_at=now()+interval '180 seconds',attempt_count=attempt_count+1,updated_at=now()
      from candidate c where a.id=c.id returning a.*'''), {'token': str(uuid4())}).mappings().first()


def finish_article(connection, claim, result: dict) -> bool:
    error = result.get('error')
    return connection.execute(text('''update news_articles set status=:status, content_text=:body,
        final_url=:final_url, fetched_at=case when :status='ready' then now() else null end,
        error_message=:error, claim_token=null, lease_expires_at=null,updated_at=now()
        where id=:id and claim_token=:token and status='running' and lease_expires_at>now()'''), {
        'id': claim['id'], 'token': claim['claim_token'], 'status': 'failed' if error else 'ready',
        'body': None if error else result['text'], 'final_url': result.get('finalUrl'), 'error': error,
    }).rowcount == 1


def fetch_isolated(url: str) -> dict:
    try:
        result = subprocess.run([sys.executable, '-m', 'info_monitor_worker.article_extract', url],
                                capture_output=True, text=True, timeout=80)
        payload = json.loads(result.stdout)
        if result.returncode and not payload.get('error'):
            raise ValueError('extractor failed')
        return payload
    except Exception:
        return {'error': '原文获取超时或解析失败，请打开原始来源或稍后重试'}


class ArticleConsumer:
    def __init__(self, engine, *, fetch=fetch_isolated):
        self.engine, self.fetch = engine, fetch
        self.stopped = Event()
        self.thread = None

    def run_once(self):
        with self.engine.begin() as connection:
            claim = claim_article(connection)
        if not claim:
            return False
        try:
            result = self.fetch(claim['url'])
        except Exception:
            result = {'error': '原文获取失败，请稍后重试'}
        with self.engine.begin() as connection:
            finish_article(connection, claim, result)
        return True

    def start(self):
        self.thread = Thread(target=self._run, name='news-articles', daemon=True)
        self.thread.start()

    def _run(self):
        while not self.stopped.is_set():
            try:
                worked = self.run_once()
            except Exception:
                logger.exception('Article queue iteration failed')
                worked = False
            # One request per second at most, bounded independently of source runs.
            self.stopped.wait(1 if worked else 2)

    def close(self):
        self.stopped.set()
        if self.thread:
            self.thread.join()
