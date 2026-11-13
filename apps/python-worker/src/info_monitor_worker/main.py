import logging
import signal

from info_monitor_worker.worker import Worker
from info_monitor_worker.http_client import close_http_client


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    worker = Worker()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: worker.stop())
    try:
        worker.run_forever()
    finally:
        close_http_client()


if __name__ == "__main__":
    main()
