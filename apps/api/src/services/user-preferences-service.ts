/**
 * User Preferences Service
 *
 * Persists theme favorites and saved filter views to PostgreSQL.
 * Replaces localStorage-based storage with durable DB storage.
 */

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";

function requireDatabase() {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  return db;
}

// ─── Theme Favorites ─────────────────────────────────────────────────────────

export async function listThemeFavorites(): Promise<string[]> {
  const db = requireDatabase();

  const rows = await db
    .selectFrom("theme_favorites")
    .select("theme_id")
    .orderBy("created_at", "desc")
    .execute();

  return rows.map((r) => r.theme_id);
}

export async function setThemeFavorite(
  themeId: string,
  favorited: boolean,
): Promise<{ themeId: string; favorited: boolean }> {
  const db = requireDatabase();

  if (favorited) {
    await db
      .insertInto("theme_favorites")
      .values({
        id: createId("fav"),
        theme_id: themeId,
        created_at: new Date().toISOString(),
      })
      .onConflict((oc) => oc.column("theme_id").doNothing())
      .execute();
  } else {
    await db
      .deleteFrom("theme_favorites")
      .where("theme_id", "=", themeId)
      .execute();
  }

  return { themeId, favorited };
}

// ─── Saved Filter Views ──────────────────────────────────────────────────────

export type SavedFilterView = {
  id: string;
  name: string;
  viewType: string;
  filters: Record<string, string>;
  createdAt: string;
};

export async function listSavedFilterViews(viewType?: string): Promise<SavedFilterView[]> {
  const db = requireDatabase();

  let query = db
    .selectFrom("saved_filter_views")
    .select(["id", "name", "view_type", "filters", "created_at"]);

  if (viewType) {
    query = query.where("view_type", "=", viewType);
  }

  const rows = await query.orderBy("created_at", "desc").execute();

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    viewType: r.view_type,
    filters: (typeof r.filters === "string" ? JSON.parse(r.filters) : r.filters) as Record<string, string>,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

export async function createSavedFilterView(
  input: { name: string; viewType: string; filters: Record<string, string> },
): Promise<SavedFilterView> {
  const db = requireDatabase();
  const now = new Date().toISOString();
  const id = createId("view");

  const newView: SavedFilterView = {
    id,
    name: input.name,
    viewType: input.viewType,
    filters: input.filters,
    createdAt: now,
  };

  await db
    .insertInto("saved_filter_views")
    .values({
      id,
      name: input.name,
      view_type: input.viewType,
      filters: input.filters,
      created_at: now,
    })
    .execute();

  return newView;
}

export async function deleteSavedFilterView(viewId: string): Promise<boolean> {
  const db = requireDatabase();

  const existing = await db
    .selectFrom("saved_filter_views")
    .select("id")
    .where("id", "=", viewId)
    .executeTakeFirst();

  if (!existing) return false;

  await db
    .deleteFrom("saved_filter_views")
    .where("id", "=", viewId)
    .execute();

  return true;
}
