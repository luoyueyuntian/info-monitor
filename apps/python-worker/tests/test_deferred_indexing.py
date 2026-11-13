from types import SimpleNamespace
from unittest.mock import Mock
import pytest
from info_monitor_worker import search_indexer as indexer


def test_index_operations_flush_in_batches_only_after_commit_scope(monkeypatch):
    add = Mock()
    monkeypatch.setattr(indexer, "_get_client", lambda: SimpleNamespace(index=lambda _: SimpleNamespace(add_documents=add)))
    with indexer.defer_indexing():
        indexer.index_event({"id": "one"})
        indexer.index_event({"id": "two"})
        add.assert_not_called()
    add.assert_called_once()
    assert [doc["id"] for doc in add.call_args.args[0]] == ["one", "two"]


def test_failed_transaction_discards_pending_search_writes(monkeypatch):
    add = Mock()
    monkeypatch.setattr(indexer, "_get_client", lambda: SimpleNamespace(index=lambda _: SimpleNamespace(add_documents=add)))
    with pytest.raises(ValueError):
        with indexer.defer_indexing():
            indexer.index_event({"id": "rolled-back"})
            raise ValueError("rollback")
    add.assert_not_called()
