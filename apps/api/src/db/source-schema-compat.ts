import { sql, type Kysely } from "kysely";

import type { Database } from "./schema.js";

let hasSourcesOnboardingStatusColumnCache: boolean | null = null;

export async function hasSourcesOnboardingStatusColumn(db: Kysely<Database>) {
  if (hasSourcesOnboardingStatusColumnCache !== null) {
    return hasSourcesOnboardingStatusColumnCache;
  }

  const result = await sql<{ exists: boolean }>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'sources'
        and column_name = 'onboarding_status'
    ) as "exists"
  `.execute(db);

  const exists = Boolean(result.rows[0]?.exists);
  hasSourcesOnboardingStatusColumnCache = exists;
  return exists;
}
