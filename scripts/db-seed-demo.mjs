import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

const themeId = "theme_surface_pro_8_demo";
const sourceId = "source_surface_pro_8_demo_feed";
const baselineRunId = "run_surface_pro_8_baseline";
const baselineSnapshotId = "snapshot_surface_pro_8_baseline";
const baselineRecordId = "record_surface_pro_8_baseline";

try {
  await client.connect();
  await client.query("begin");

  await client.query(
    `
      insert into themes (
        id,
        name,
        theme_type,
        info_type,
        description,
        status,
        metadata
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        'active',
        '{}'::jsonb
      )
      on conflict (id) do update
      set
        name = excluded.name,
        theme_type = excluded.theme_type,
        info_type = excluded.info_type,
        description = excluded.description,
        status = 'active',
        updated_at = now()
    `,
    [
      themeId,
      "Surface Pro 8 16G + 512G Price",
      "price",
      "price",
      "Demo price-monitoring theme seeded for local development",
    ],
  );

  await client.query(
    `
      insert into sources (
        id,
        theme_id,
        name,
        source_type,
        adapter_key,
        status,
        is_paused,
        config
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        'active',
        false,
        cast($6 as jsonb)
      )
      on conflict (id) do update
      set
        theme_id = excluded.theme_id,
        name = excluded.name,
        source_type = excluded.source_type,
        adapter_key = excluded.adapter_key,
        status = 'active',
        is_paused = false,
        config = excluded.config,
        updated_at = now()
    `,
    [
      sourceId,
      themeId,
      "Surface Pro 8 Demo Feed",
      "page_list",
      "demo_price_feed",
      JSON.stringify({
        file_path: "apps/python-worker/examples/surface-pro-8-price-feed.json",
        schedule_interval_seconds: 60,
      }),
    ],
  );

  await client.query(
    `
      insert into source_runs (
        id,
        theme_id,
        source_id,
        trigger_type,
        status,
        started_at,
        finished_at,
        created_at
      ) values (
        $1,
        $2,
        $3,
        'seed',
        'completed',
        '2026-05-28T09:30:00Z',
        '2026-05-28T09:30:00Z',
        '2026-05-28T09:30:00Z'
      )
      on conflict (id) do nothing
    `,
    [baselineRunId, themeId, sourceId],
  );

  await client.query(
    `
      insert into raw_snapshots (
        id,
        source_run_id,
        theme_id,
        source_id,
        payload_json,
        fetched_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        cast($5 as jsonb),
        '2026-05-28T09:30:00Z'
      )
      on conflict (id) do nothing
    `,
    [
      baselineSnapshotId,
      baselineRunId,
      themeId,
      sourceId,
      JSON.stringify([
        {
          title: "Surface Pro 8 16G + 512G - baseline",
          occurred_at: "2026-05-28T09:30:00Z",
          price: 4100,
          currency: "CNY",
          spec: "16G+512G",
          url: "https://example.com/xianyu/surface-pro-8-baseline",
        },
      ]),
    ],
  );

  await client.query(
    `
      insert into normalized_records (
        id,
        source_run_id,
        theme_id,
        source_id,
        info_type,
        occurred_at,
        title,
        fingerprint,
        content,
        created_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        'price',
        '2026-05-28T09:30:00Z',
        'Surface Pro 8 16G + 512G - baseline',
        'baseline_surface_pro_8_price_16g_512g',
        cast($5 as jsonb),
        '2026-05-28T09:30:00Z'
      )
      on conflict (id) do nothing
    `,
    [
      baselineRecordId,
      baselineRunId,
      themeId,
      sourceId,
      JSON.stringify({
        price: 4100,
        currency: "CNY",
        spec: "16G+512G",
        url: "https://example.com/xianyu/surface-pro-8-baseline",
      }),
    ],
  );

  await client.query("commit");
  console.log("Demo theme and source seeded.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed demo data.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
