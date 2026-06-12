import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

import { DEMO_SOURCE_IDS, DEMO_THEME_IDS } from "./lib/demo-scene-ids.mjs";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
const sourceId = process.argv[2] ?? DEMO_SOURCE_IDS.ZHUANZHUAN_SURFACE;
const themeId = process.argv[3] ?? DEMO_THEME_IDS.SURFACE_PRO_8;

try {
  await client.connect();
  const runId = `run_demo_${randomUUID()}`;

  await client.query(
    `
      insert into source_runs (
        id,
        theme_id,
        source_id,
        trigger_type,
        status
      ) values (
        $1,
        $2,
        $3,
        'manual',
        'pending'
      )
    `,
    [runId, themeId, sourceId],
  );

  console.log(`Demo run queued: ${runId}`);
} catch (error) {
  console.error("Failed to enqueue demo run.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
