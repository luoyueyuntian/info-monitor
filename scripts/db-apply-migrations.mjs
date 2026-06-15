import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const migrationsDir = path.resolve("db/migrations");
const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No migration files found.");
  process.exit(0);
}

const client = new pg.Client({ connectionString: databaseUrl });

// Error codes that indicate "already exists" — safe to skip
const ALREADY_EXISTS_CODES = new Set([
  "42P07", // relation already exists
  "42710", // duplicate object
  "42701", // duplicate column
  "23505", // unique_violation (duplicate key)
  "42P16", // invalid table definition (e.g., column already exists)
]);

try {
  await client.connect();

  // Create migrations tracking table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Get already-applied migrations
  const { rows } = await client.query("SELECT name FROM _migrations");
  const applied = new Set(rows.map((r) => r.name));

  let applied_count = 0;
  let skipped_count = 0;

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    console.log(`Applying migration: ${file}`);

    try {
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      applied_count++;
    } catch (error) {
      if (ALREADY_EXISTS_CODES.has(error.code)) {
        // Migration already applied (object exists), mark as tracked
        console.log(`  ↳ Skipped (already applied)`);
        await client.query(
          "INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING",
          [file]
        );
        skipped_count++;
      } else {
        throw error;
      }
    }
  }

  if (applied_count === 0 && skipped_count === 0) {
    console.log("All migrations already applied.");
  } else {
    console.log(
      `Done: ${applied_count} applied, ${skipped_count} skipped.`
    );
  }
} catch (error) {
  console.error("Failed to apply migrations.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
