import logging
import signal

from info_monitor_worker.worker import Worker
from info_monitor_worker.article_queue import ArticleConsumer
from info_monitor_worker.db import create_db_engine
from info_monitor_worker.http_client import close_http_client


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    worker = Worker()
    article_engine = create_db_engine()
    articles = ArticleConsumer(article_engine)
    articles.start()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: (articles.stopped.set(), worker.stop()))
    try:
        worker.run_forever()
    finally:
        articles.close()
        article_engine.dispose()
        close_http_client()


if __name__ == "__main__":
    main()
