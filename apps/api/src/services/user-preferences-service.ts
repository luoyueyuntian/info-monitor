/**
 * User Preferences Service
 *
 * Persists theme favorites and saved filter views to PostgreSQL.
 * Replaces localStorage-based storage with durable DB storage.
 *
 * Mock mode: in-memory arrays (same pattern as other services).
 */

import { getDatabase } from "../db/client.js";
import { createId } from "../lib/ids.js";

// ─── In-memory stores for mock mode ──────────────────────────────────────────

const mockFavorites: Array<{ id: string; themeId: string; createdAt: string }> = [];
const mockSavedViews: Array<{
  id: string;
  name: string;
  viewType: string;
  filters: Record<string, string>;
  createdAt: string;
}> = [];

// ─── Theme Favorites ─────────────────────────────────────────────────────────

export async function listThemeFavorites(): Promise<string[]> {
  const db = getDatabase();

  if (!db) {
    return mockFavorites.map((f) => f.themeId);
  }

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
  const db = getDatabase();

  if (!db) {
    const existing = mockFavorites.find((f) => f.themeId === themeId);
    if (favorited && !existing) {
      mockFavorites.push({
        id: createId("fav"),
        themeId,
        createdAt: new Date().toISOString(),
      });
    } else if (!favorited && existing) {
      const idx = mockFavorites.indexOf(existing);
      mockFavorites.splice(idx, 1);
    }
    return { themeId, favorited };
  }

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
  const db = getDatabase();

  if (!db) {
    let views = mockSavedViews;
    if (viewType) {
      views = views.filter((v) => v.viewType === viewType);
    }
    return views.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

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
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = createId("view");

  const newView: SavedFilterView = {
    id,
    name: input.name,
    viewType: input.viewType,
    filters: input.filters,
    createdAt: now,
  };

  if (!db) {
    mockSavedViews.push(newView);
    return newView;
  }

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
  const db = getDatabase();

  if (!db) {
    const idx = mockSavedViews.findIndex((v) => v.id === viewId);
    if (idx === -1) return false;
    mockSavedViews.splice(idx, 1);
    return true;
  }

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
