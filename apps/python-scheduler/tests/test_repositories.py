from __future__ import annotations

import unittest

from sqlalchemy import create_engine, text

from info_monitor_scheduler.repositories import fetch_schedulable_sources


class FetchSchedulableSourcesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

        with self.engine.begin() as connection:
            connection.execute(
                text(
                    """
                    create table sources (
                      id text primary key,
                      theme_id text not null,
                      config text,
                      is_paused boolean not null default false,
                      status text not null,
                      latest_success_at text,
                      created_at text
                    )
                    """
                )
            )

    def test_returns_non_paused_sources_across_health_states(self) -> None:
        with self.engine.begin() as connection:
            connection.execute(
                text(
                    """
                    insert into sources (
                      id,
                      theme_id,
                      config,
                      is_paused,
                      status,
                      latest_success_at,
                      created_at
                    )
                    values
                      (
                        'source_active',
                        'theme_1',
                        '{}',
                        false,
                        'active',
                        null,
                        '2026-06-23T00:00:00Z'
                      ),
                      (
                        'source_healthy',
                        'theme_2',
                        '{}',
                        false,
                        'healthy',
                        null,
                        '2026-06-23T00:00:01Z'
                      ),
                      (
                        'source_warning',
                        'theme_3',
                        '{}',
                        false,
                        'warning',
                        null,
                        '2026-06-23T00:00:02Z'
                      ),
                      (
                        'source_paused',
                        'theme_4',
                        '{}',
                        true,
                        'active',
                        null,
                        '2026-06-23T00:00:03Z'
                      )
                    """
                )
            )

            rows = fetch_schedulable_sources(connection)

        self.assertEqual(
            [row["source_id"] for row in rows],
            ["source_active", "source_healthy", "source_warning"],
        )


if __name__ == "__main__":
    unittest.main()
