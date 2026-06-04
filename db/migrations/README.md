# Database Migrations

This directory is the shared home for SQL migrations used by both the Node API
and the Python worker stack.

Guidelines:

1. Treat SQL files here as the source of truth for schema evolution.
2. Keep migration files append-only.
3. Avoid letting Node and Python maintain separate migration histories.
