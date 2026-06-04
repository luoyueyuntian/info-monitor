import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
const sourceId = process.argv[2] ?? "source_surface_pro_8_demo_feed";
const themeId = process.argv[3] ?? "theme_surface_pro_8_demo";

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
