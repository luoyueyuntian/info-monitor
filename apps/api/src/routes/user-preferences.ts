import type { FastifyInstance } from "fastify";

import {
  listThemeFavorites,
  setThemeFavorite,
  listSavedFilterViews,
  createSavedFilterView,
  deleteSavedFilterView,
} from "../services/user-preferences-service.js";

export async function registerUserPreferencesRoutes(app: FastifyInstance) {
  // ─── Theme Favorites ─────────────────────────────────────────────────────

  app.get("/api/user-preferences/favorites", async () => {
    const favorites = await listThemeFavorites();
    return { favorites };
  });

  app.put<{
    Params: { themeId: string };
    Body: { favorited?: boolean };
  }>("/api/user-preferences/favorites/:themeId", async (request, reply) => {
    const { themeId } = request.params;
    const favorited = request.body?.favorited ?? true;

    const result = await setThemeFavorite(themeId, favorited);
    return result;
  });

  // ─── Saved Filter Views ──────────────────────────────────────────────────

  app.get<{
    Querystring: { viewType?: string };
  }>("/api/user-preferences/saved-views", async (request) => {
    const { viewType } = request.query;
    return listSavedFilterViews(viewType);
  });

  app.post<{
    Body: { name?: string; viewType?: string; filters?: Record<string, string> };
  }>("/api/user-preferences/saved-views", async (request, reply) => {
    const { name, viewType, filters } = request.body ?? {};

    if (!name || !viewType) {
      reply.code(400);
      return { message: "name and viewType are required" };
    }

    if (!["events", "themes", "sources"].includes(viewType)) {
      reply.code(400);
      return { message: "viewType must be events, themes, or sources" };
    }

    const created = await createSavedFilterView({
      name,
      viewType,
      filters: filters ?? {},
    });

    reply.code(201);
    return created;
  });

  app.delete<{
    Params: { viewId: string };
  }>("/api/user-preferences/saved-views/:viewId", async (request, reply) => {
    const deleted = await deleteSavedFilterView(request.params.viewId);

    if (!deleted) {
      reply.code(404);
      return { message: "Saved view not found" };
    }

    return { success: true };
  });
}
