"""Meilisearch document indexer for Info Monitor.

Indexes events, normalized_records, themes, and notifications.
Gracefully degrades when Meilisearch is unavailable.
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from contextvars import ContextVar
from copy import deepcopy
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_client = None
_checked = False


_pending_documents: ContextVar = ContextVar("pending_index_documents", default=None)


@contextmanager
def defer_indexing():
    """Flush best-effort batches only after the enclosed transaction commits."""
    documents = {}
    token = _pending_documents.set(documents)
    try:
        yield
    finally:
        _pending_documents.reset(token)
    for index_name, rows in documents.items():
        index_batch(index_name, rows)


def _get_client():
    """Lazy-init Meilisearch client. Returns None if unavailable."""
    global _client, _checked

    if _checked:
        return _client

    _checked = True
    host = os.getenv("MEILI_HOST", "")
    if not host:
        return None

    try:
        from meilisearch import Client

        api_key = os.getenv("MEILI_API_KEY")
        _client = Client(host, api_key)
        # Test connection
        _client.get_health()
        logger.info("Meilisearch connected at %s", host)
        return _client
    except Exception as exc:
        logger.debug("Meilisearch unavailable: %s", exc)
        _client = None
        return None


INDEX_SETTINGS: Dict[str, Dict[str, Any]] = {
    "events": {
        "searchableAttributes": ["title", "summary", "signal", "evidence"],
        "filterableAttributes": ["themeId", "signal", "infoType", "status"],
        "sortableAttributes": ["occurredAt"],
    },
    "normalized_records": {
        "searchableAttributes": ["title", "content"],
        "filterableAttributes": ["themeId", "infoType", "sourceId"],
    },
    "themes": {
        "searchableAttributes": ["name", "description"],
        "filterableAttributes": ["type", "status"],
    },
    "notifications": {
        "searchableAttributes": ["title", "summary", "signal"],
        "filterableAttributes": ["eventId", "status", "signal"],
    },
}


def ensure_indexes() -> None:
    """Create indexes and configure settings if Meilisearch is available."""
    client = _get_client()
    if not client:
        return

    for index_uid, settings in INDEX_SETTINGS.items():
        try:
            client.create_index(index_uid, {"primaryKey": "id"})
        except Exception:
            pass  # Index already exists
        try:
            client.index(index_uid).update_settings(settings)
        except Exception as exc:
            logger.warning("Failed to update settings for %s: %s", index_uid, exc)


def index_event(event: Dict[str, Any]) -> None:
    """Index a single event document."""
    doc = {
        "id": event.get("id", ""),
        "title": event.get("title", ""),
        "summary": event.get("summary", ""),
        "signal": event.get("signal", ""),
        "evidence": event.get("evidence", []),
        "themeId": event.get("themeId", ""),
        "themeName": event.get("themeName", ""),
        "infoType": event.get("infoType", ""),
        "status": event.get("status", ""),
        "occurredAt": event.get("occurredAt", ""),
    }

    index_batch("events", [doc])


def index_normalized_record(record: Dict[str, Any]) -> None:
    """Index a single normalized record."""
    doc = {
        "id": record.get("id", ""),
        "title": record.get("title", ""),
        "content": record.get("content", ""),
        "infoType": record.get("infoType", ""),
        "themeId": record.get("themeId", ""),
        "sourceId": record.get("sourceId", ""),
    }

    index_batch("normalized_records", [doc])


def index_theme(theme: Dict[str, Any]) -> None:
    """Index a single theme."""
    doc = {
        "id": theme.get("id", ""),
        "name": theme.get("name", ""),
        "description": theme.get("description", ""),
        "type": theme.get("type", ""),
        "status": theme.get("status", ""),
    }

    index_batch("themes", [doc])


def index_notification(notification: Dict[str, Any]) -> None:
    """Index a single notification."""
    doc = {
        "id": notification.get("id", ""),
        "title": notification.get("title", ""),
        "summary": notification.get("summary", ""),
        "signal": notification.get("signal", ""),
        "eventId": notification.get("eventId", ""),
        "status": notification.get("status", ""),
    }

    index_batch("notifications", [doc])


def index_batch(index_name: str, documents: List[Dict[str, Any]]) -> None:
    """Index a batch of documents to a given index."""
    pending = _pending_documents.get()
    if pending is not None:
        pending.setdefault(index_name, []).extend(deepcopy(documents))
        return
    client = _get_client()
    if not client or not documents:
        return

    try:
        client.index(index_name).add_documents(documents)
        logger.info("Indexed %d documents to %s", len(documents), index_name)
    except Exception as exc:
        logger.warning("Failed to batch index to %s: %s", index_name, exc)
