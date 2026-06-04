import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

import { getConfig } from "../config.js";
import type { Database } from "./schema.js";

let dbInstance: Kysely<Database> | null = null;

export function getDatabase(): Kysely<Database> | null {
  const config = getConfig();

  if (!config.databaseUrl) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
  });

  dbInstance = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return dbInstance;
}
