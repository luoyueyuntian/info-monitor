import { observeDatabaseQuery } from "../lib/database-metrics.js";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import { getConfig } from "../config.js";
import type { Database } from "./schema.js";

let poolInstance: pg.Pool | null = null;

export function getDatabasePoolMetrics() {
  return { total: poolInstance?.totalCount ?? 0, idle: poolInstance?.idleCount ?? 0, waiting: poolInstance?.waitingCount ?? 0 };
}

let dbInstance: Kysely<Database> | null = null;

export function getDatabase(): Kysely<Database> {
  const config = getConfig();

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  if (dbInstance) {
    return dbInstance;
  }

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    application_name: "info-monitor-api",
    connectionTimeoutMillis: 2000,
  });

  poolInstance = pool;
  dbInstance = new Kysely<Database>({
    log: (event) => observeDatabaseQuery(event.queryDurationMillis, event.level === "error"),
    dialect: new PostgresDialect({ pool }),
  });

  return dbInstance;
}
