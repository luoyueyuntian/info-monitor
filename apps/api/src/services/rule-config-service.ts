import type {
  RuleConfiguration,
  RuleConfigurationInput,
} from "@info-monitor/shared-contracts";

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";

function requireDatabase() {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  return db;
}

export async function listRuleConfigurations(
  themeId?: string,
  ruleKey?: string,
): Promise<RuleConfiguration[]> {
  const db = requireDatabase();

  let query = db
    .selectFrom("rule_configurations")
    .select([
      "id",
      "rule_key as ruleKey",
      "theme_id as themeId",
      "config",
      "is_enabled as isEnabled",
      "priority",
      "created_at as createdAt",
      "updated_at as updatedAt",
    ]);

  if (themeId) {
    query = query.where("theme_id", "=", themeId);
  }

  if (ruleKey) {
    query = query.where("rule_key", "=", ruleKey);
  }

  const rows = await query.orderBy("priority", "desc").execute();

  return rows.map((row) => ({
    ...row,
    config: (typeof row.config === "string" ? JSON.parse(row.config) : row.config) as Record<string, unknown>,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }));
}

export async function getRuleConfiguration(
  configId: string,
): Promise<RuleConfiguration | null> {
  const db = requireDatabase();

  const row = await db
    .selectFrom("rule_configurations")
    .select([
      "id",
      "rule_key as ruleKey",
      "theme_id as themeId",
      "config",
      "is_enabled as isEnabled",
      "priority",
      "created_at as createdAt",
      "updated_at as updatedAt",
    ])
    .where("id", "=", configId)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return {
    ...row,
    config: (typeof row.config === "string" ? JSON.parse(row.config) : row.config) as Record<string, unknown>,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export async function createRuleConfiguration(
  input: RuleConfigurationInput,
): Promise<RuleConfiguration> {
  const db = requireDatabase();
  const now = new Date().toISOString();
  const id = createId("rule_configurations");

  const config: RuleConfiguration = {
    id,
    ruleKey: input.ruleKey,
    themeId: input.themeId ?? null,
    config: input.config ?? {},
    isEnabled: input.isEnabled ?? true,
    priority: input.priority ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .insertInto("rule_configurations")
    .values({
      id,
      rule_key: input.ruleKey,
      theme_id: input.themeId ?? null,
      config: JSON.stringify(input.config ?? {}),
      is_enabled: input.isEnabled ?? true,
      priority: input.priority ?? 0,
    })
    .execute();

  return config;
}

export async function updateRuleConfiguration(
  configId: string,
  input: Partial<RuleConfigurationInput>,
): Promise<RuleConfiguration | null> {
  const db = requireDatabase();

  const updatePatch: Record<string, unknown> = {};

  if (input.ruleKey) updatePatch.rule_key = input.ruleKey;
  if (input.themeId !== undefined) updatePatch.theme_id = input.themeId;
  if (input.config) updatePatch.config = JSON.stringify(input.config);
  if (input.isEnabled !== undefined) updatePatch.is_enabled = input.isEnabled;
  if (input.priority !== undefined) updatePatch.priority = input.priority;
  updatePatch.updated_at = new Date();

  if (Object.keys(updatePatch).length === 0) {
    return getRuleConfiguration(configId);
  }

  await db
    .updateTable("rule_configurations")
    .set(updatePatch)
    .where("id", "=", configId)
    .execute();

  return getRuleConfiguration(configId);
}

export async function deleteRuleConfiguration(
  configId: string,
): Promise<boolean> {
  const db = requireDatabase();

  const result = await db
    .deleteFrom("rule_configurations")
    .where("id", "=", configId)
    .executeTakeFirst();

  return Number(result?.numDeletedRows ?? 0) > 0;
}

export async function getEffectiveRuleConfig(
  ruleKey: string,
  themeId?: string,
): Promise<Record<string, unknown> | null> {
  const db = requireDatabase();

  let query = db
    .selectFrom("rule_configurations")
    .select([
      "theme_id as themeId",
      "config",
      "priority",
    ])
    .where("rule_key", "=", ruleKey)
    .where("is_enabled", "=", true);

  if (themeId) {
    query = query.where((eb) =>
      eb.or([
        eb("theme_id", "=", themeId),
        eb("theme_id", "is", null),
      ]),
    );
  } else {
    query = query.where("theme_id", "is", null);
  }

  const rows = await query.execute();

  // Sort by specificity and priority
  const sorted = rows
    .map((row) => ({
      ...row,
      specificity: row.themeId ? 1 : 0,
    }))
    .sort((a, b) => b.specificity - a.specificity || b.priority - a.priority);

  const matched = sorted[0];
  if (!matched) return null;

  return (typeof matched.config === "string" ? JSON.parse(matched.config) : matched.config) as Record<string, unknown>;
}
