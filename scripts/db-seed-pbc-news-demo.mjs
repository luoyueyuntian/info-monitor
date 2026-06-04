import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

const themeId = "theme_pbc_news_demo";
const sourceId = "source_pbc_news_list_demo";

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
        'PBOC News Releases',
        'news_announcement',
        'news_announcement',
        'Official PBOC news and release list for investment information tracking',
        'active',
        '{}'::jsonb
      )
      on conflict (id) do update
      set
        name = excluded.name,
        description = excluded.description,
        status = 'active',
        updated_at = now()
    `,
    [themeId],
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
        'PBOC News List',
        'page_list',
        'pbc_news_list',
        'active',
        false,
        cast($3 as jsonb)
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
      JSON.stringify({
        path: "/goutongjiaoliu/113456/113469/index.html",
        schedule_interval_seconds: 21600,
        emit_events_on_latest_only: true,
      }),
    ],
  );

  await client.query("commit");
  console.log("PBOC news demo theme and source seeded.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Failed to seed PBOC news demo.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
