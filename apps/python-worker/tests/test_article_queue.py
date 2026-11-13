from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from sqlalchemy import text
from .test_run_leases import queue_db  # noqa: F401
import pytest
import os

from info_monitor_worker.article_queue import enqueue_article, claim_article, finish_article, ArticleConsumer

pytestmark = pytest.mark.skipif(not os.getenv('TEST_DATABASE_URL'), reason='requires isolated PostgreSQL')


def test_enqueue_idempotent_and_claims_disjoint(queue_db):
    with queue_db.begin() as c:
        enqueue_article(c, 'https://example.com/news#section', '新闻')
        enqueue_article(c, 'https://example.com/news#other', '新闻')
        enqueue_article(c, 'https://example.com/other', '其他')
        assert c.execute(text('select count(*) from news_articles')).scalar() == 2
    barrier = Barrier(2)
    def claim():
        with queue_db.begin() as c:
            barrier.wait(timeout=5)
            return claim_article(c)
    with ThreadPoolExecutor(2) as pool:
        claims = list(pool.map(lambda _: claim(), range(2)))
    assert len({r['id'] for r in claims}) == 2


def test_expired_claim_fenced_and_attempts_bounded(queue_db):
    with queue_db.begin() as c:
        enqueue_article(c, 'https://example.com/a', '新闻')
        old = claim_article(c)
        c.execute(text("update news_articles set lease_expires_at=now()-interval '1 second'"))
        new = claim_article(c)
        assert old['claim_token'] != new['claim_token']
        assert not finish_article(c, old, {'text': 'stale', 'contentType': 'html'})
        assert finish_article(c, new, {'text': 'original', 'contentType': 'html', 'finalUrl': 'https://example.com/a'})
        assert c.execute(text('select content_text from news_articles')).scalar() == 'original'
        c.execute(text("update news_articles set status='running', attempt_count=3,lease_expires_at=now()-interval '1 second'"))
        assert claim_article(c) is None
        assert c.execute(text('select status from news_articles')).scalar() == 'failed'


def test_consumer_releases_transaction_while_fetching(queue_db):
    with queue_db.begin() as c:
        enqueue_article(c, 'https://example.com/a', '标题')
    def fetch(url):
        with queue_db.begin() as c:
            assert c.execute(text("select count(*) from pg_stat_activity where state='idle in transaction' and datname=current_database() and pid<>pg_backend_pid() and application_name='article-test'")).scalar() == 0
        return {'text': '原文', 'contentType': 'html', 'finalUrl': url}
    consumer = ArticleConsumer(queue_db, fetch=fetch)
    assert consumer.run_once()
    with queue_db.begin() as c:
        row = c.execute(text('select * from news_articles')).mappings().one()
        assert row['status'] == 'ready'
        assert row['content_text'] == '原文'


@pytest.mark.parametrize('trigger,expected', [('scheduled', 1), ('test', 0), ('replay', 0)])
def test_production_ingestion_queues_original_without_affecting_fingerprint(queue_db, monkeypatch, trigger, expected):
    from dataclasses import replace
    from info_monitor_worker.config import load_config
    from info_monitor_worker.models import RawFetchResult
    from info_monitor_worker.repositories import claim_pending_runs
    import info_monitor_worker.service as module
    from info_monitor_worker.service import WorkerService
    payload = [{'title': '新闻标题', 'occurred_at': '2026-11-13T01:00:00Z', 'url': 'https://example.com/news', 'description': '摘要'}]
    with queue_db.begin() as c:
        c.exec_driver_sql("update themes set info_type='news_announcement',theme_type='news_announcement'; update source_runs set status='completed' where id!='r1'")
        c.execute(text('update source_runs set trigger_type=:trigger where id=\'r1\''), {'trigger': trigger})
        if trigger == 'replay':
            c.execute(text("insert into raw_snapshots(id,source_run_id,theme_id,source_id,payload_json) values ('snapshot','r1','t1','s1',cast(:payload as jsonb))"), {'payload': __import__('json').dumps(payload)})
        if trigger == 'replay':
            c.exec_driver_sql("update source_runs set replay_snapshot_id='snapshot' where id='r1'")
        run = claim_pending_runs(c, limit=1)[0]
    class Adapter:
        def fetch(self, *args):
            return RawFetchResult(payload=payload)
        def map_to_normalizer_input(self, raw):
            return raw.payload
    monkeypatch.setattr(module, 'get_adapter', lambda _: Adapter())
    monkeypatch.setattr(module, 'enrich_record_sync', lambda **kwargs: None)
    monkeypatch.setattr(module, 'index_normalized_record', lambda _: None)
    monkeypatch.setattr(module, 'index_event', lambda _: None)
    monkeypatch.setattr(module, 'index_notification', lambda _: None)
    service = WorkerService(engine=queue_db, config=replace(load_config(), concurrency=1))
    try:
        service._process_run(run)
        with queue_db.begin() as c:
            assert c.execute(text("select status from source_runs where id='r1'")).scalar() == 'completed'
            assert c.execute(text('select count(*) from news_articles')).scalar() == expected
            if expected:
                content = c.execute(text('select content from normalized_records')).scalar_one()
                assert content['description'] == '摘要'
                assert 'content_text' not in content
    finally:
        service.close()
