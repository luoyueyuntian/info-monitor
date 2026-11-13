"""Shared HTTP client with anti-scraping measures.

Provides rotating User-Agent, retry with exponential backoff,
per-domain rate limiting, proxy support, and response validation.
"""
from __future__ import annotations

import logging
import os
import random
import time
from typing import Any
from threading import Lock, local
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

_DEFAULT_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
]

_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
_CAPTCHA_INDICATORS = ["captcha", "verify you are human", "access denied", "blocked"]


class _RateLimiter:
    """Simple per-domain token bucket rate limiter."""

    def __init__(self, max_per_second: float = 2.0):
        self._max_per_second = max_per_second
        self._last_request: dict[str, float] = {}
        self._lock = Lock()

    def wait(self, domain: str) -> None:
        if self._max_per_second <= 0:
            return
        with self._lock:
            now = time.monotonic()
            interval = 1.0 / self._max_per_second
            reserved = max(now, self._last_request.get(domain, now - interval) + interval)
            self._last_request[domain] = reserved
        if reserved > now:
            time.sleep(reserved - now)



class HttpClient:
    """HTTP client with rotating UA, retry, rate limiting, and proxy support."""

    def __init__(
        self,
        *,
        timeout: float = 20.0,
        max_retries: int = 3,
        rate_limit_per_second: float = 2.0,
        proxy: str | None = None,
        user_agents: list[str] | None = None,
    ):
        self._timeout = timeout
        self._max_retries = max(1, max_retries)
        self._user_agents = user_agents or list(_DEFAULT_USER_AGENTS)
        self._rate_limiter = _RateLimiter(rate_limit_per_second)
        self._proxy = proxy
        self._local = local()
        self._clients = []
        self._clients_lock = Lock()
        self._closed = False

    def _session(self):
        if self._closed:
            raise RuntimeError("HTTP client is closed")
        client = getattr(self._local, "client", None)
        if client is None:
            options = {"timeout": self._timeout}
            if self._proxy:
                options["proxy"] = self._proxy
            client = httpx.Client(**options)
            with self._clients_lock:
                if self._closed:
                    client.close()
                    raise RuntimeError("HTTP client is closed")
                self._clients.append(client)
            self._local.client = client
        return client

    def close(self):
        with self._clients_lock:
            self._closed = True
            clients, self._clients = self._clients, []
        for client in clients:
            client.close()

    def _pick_ua(self) -> str:
        return random.choice(self._user_agents)

    def _get_domain(self, url: str) -> str:
        return urlparse(url).netloc or url

    def _check_response(self, response: httpx.Response) -> None:
        """Log warnings for suspicious responses (CAPTCHA, blocking)."""
        if response.status_code == 403:
            text_lower = response.text[:2000].lower()
            for indicator in _CAPTCHA_INDICATORS:
                if indicator in text_lower:
                    logger.warning(
                        "Possible CAPTCHA/block detected on %s: status=403, indicator=%r",
                        response.url,
                        indicator,
                    )
                    break

    def get(
        self,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        follow_redirects: bool = False,
    ) -> httpx.Response:
        """GET request with retry, UA rotation, and rate limiting."""
        return self._request("GET", url, params=params, headers=headers, follow_redirects=follow_redirects)

    def post(
        self,
        url: str,
        *,
        data: Any = None,
        json: Any = None,
        headers: dict[str, str] | None = None,
        follow_redirects: bool = False,
    ) -> httpx.Response:
        """POST request with retry, UA rotation, and rate limiting."""
        return self._request("POST", url, data=data, json=json, headers=headers, follow_redirects=follow_redirects)

    def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        data: Any = None,
        json: Any = None,
        headers: dict[str, str] | None = None,
        follow_redirects: bool = False,
    ) -> httpx.Response:
        _client_cls = getattr(httpx, "Client", None)
        if not callable(_client_cls) or _client_cls is object:
            raise RuntimeError("httpx is not properly installed or has been mocked")

        domain = self._get_domain(url)
        last_exc: Exception | None = None

        for attempt in range(self._max_retries):
            self._rate_limiter.wait(domain)

            ua = self._pick_ua()
            merged_headers = {"User-Agent": ua}
            if headers:
                merged_headers.update(headers)

            try:
                response = self._session().request(
                    method, url, params=params, data=data, json=json,
                    headers=merged_headers, follow_redirects=follow_redirects,
                )

                self._check_response(response)

                if response.status_code in _RETRYABLE_STATUS_CODES:
                    if attempt < self._max_retries - 1:
                        delay = (2 ** attempt) + random.uniform(0, 1)
                        logger.info(
                            "Retryable status %d on %s, attempt %d/%d, waiting %.1fs",
                            response.status_code,
                            url,
                            attempt + 1,
                            self._max_retries,
                            delay,
                        )
                        time.sleep(delay)
                        continue

                response.raise_for_status()
                return response

            except Exception as exc:
                _TimeoutExc = getattr(httpx, "TimeoutException", None)
                _StatusExc = getattr(httpx, "HTTPStatusError", None)
                if _StatusExc and isinstance(exc, _StatusExc):
                    raise
                if _TimeoutExc and isinstance(exc, _TimeoutExc):
                    last_exc = exc
                    if attempt < self._max_retries - 1:
                        delay = (2 ** attempt) + random.uniform(0, 1)
                        logger.info(
                            "Timeout on %s, attempt %d/%d, waiting %.1fs",
                            url,
                            attempt + 1,
                            self._max_retries,
                            delay,
                        )
                        time.sleep(delay)
                        continue
                    raise
                last_exc = exc
                if attempt < self._max_retries - 1:
                    delay = (2 ** attempt) + random.uniform(0, 1)
                    logger.info(
                        "Error on %s: %s, attempt %d/%d, waiting %.1fs",
                        url,
                        exc,
                        attempt + 1,
                        self._max_retries,
                        delay,
                    )
                    time.sleep(delay)
                    continue
                raise

        raise last_exc  # type: ignore[misc]


def _load_user_agents() -> list[str] | None:
    custom = os.getenv("USER_AGENT_POOL", "").strip()
    if custom:
        return [ua.strip() for ua in custom.split(",") if ua.strip()]
    return None


def _create_client() -> HttpClient:
    return HttpClient(
        timeout=float(os.getenv("REQUEST_TIMEOUT", "20")),
        max_retries=int(os.getenv("MAX_RETRIES", "3")),
        rate_limit_per_second=float(os.getenv("RATE_LIMIT_PER_DOMAIN_PER_SECOND", "2")),
        proxy=os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY") or None,
        user_agents=_load_user_agents(),
    )


_instance: HttpClient | None = None
_instance_lock = Lock()


def get_http_client() -> HttpClient:
    """Return a module-level singleton HttpClient."""
    global _instance
    with _instance_lock:
        if _instance is None:
            _instance = _create_client()
    return _instance


def close_http_client() -> None:
    global _instance
    with _instance_lock:
        client, _instance = _instance, None
    if client:
        client.close()
