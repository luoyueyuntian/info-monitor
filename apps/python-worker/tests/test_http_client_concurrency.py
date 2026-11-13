from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import httpx
from info_monitor_worker import http_client as module


def test_connection_clients_are_reused_per_thread_and_closed(monkeypatch):
    original = httpx.Client
    clients = []
    def factory(**kwargs):
        client = original(transport=httpx.MockTransport(lambda request: httpx.Response(200, json={"ok": True})), **kwargs)
        clients.append(client)
        return client
    monkeypatch.setattr(module.httpx, "Client", factory)
    client = module.HttpClient(max_retries=1, rate_limit_per_second=0)
    client.get("https://example.test/one")
    client.get("https://example.test/two")
    assert len(clients) == 1
    barrier = Barrier(2)
    def request_pair():
        barrier.wait()
        client.get("https://example.test/thread-one")
        client.get("https://example.test/thread-two")
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: request_pair(), range(2)))
    assert len(clients) == 3
    client.close()
    assert all(c.is_closed for c in clients)


def test_domain_slots_are_reserved_across_threads(monkeypatch):
    delays = []
    monkeypatch.setattr(module.time, "monotonic", lambda: 0)
    monkeypatch.setattr(module.time, "sleep", lambda delay: delays.append(delay))
    limiter = module._RateLimiter(2)
    barrier = Barrier(4)
    def wait():
        barrier.wait()
        limiter.wait("example.test")
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda _: wait(), range(4)))
    assert sorted(delays) == [0.5, 1.0, 1.5]
