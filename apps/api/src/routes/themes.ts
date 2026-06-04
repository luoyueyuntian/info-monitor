import type { FastifyInstance } from "fastify";

import { createTheme, deleteTheme, getThemeDetail, listThemes, updateTheme } from "../services/theme-service.js";
import { enqueueManualSourceRun } from "../services/source-service.js";

export async function registerThemeRoutes(app: FastifyInstance) {
  app.get("/api/themes", async () => listThemes());

  app.get<{ Params: { themeId: string } }>("/api/themes/:themeId", async (request, reply) => {
    const detail = await getThemeDetail(request.params.themeId);

    if (!detail) {
      reply.code(404);
      return { message: "Theme not found" };
    }

    return detail;
  });

  app.post("/api/themes", async (request, reply) => {
    const body = request.body as {
      name?: string;
      themeType?: string;
      infoType?: string;
      description?: string;
      runImmediately?: boolean;
      sources?: Array<{
        name: string;
        sourceType: string;
        adapterKey: string;
        config?: Record<string, unknown>;
      }>;
    };

    if (!body?.name || !body.themeType || !body.infoType) {
      reply.code(400);
      return { message: "name, themeType, and infoType are required" };
    }

    const created = await createTheme({
      name: body.name,
      themeType: body.themeType,
      infoType: body.infoType,
      description: body.description,
      sources: body.sources ?? [],
    });

    const queuedSourceIds: string[] = [];

    if (body.runImmediately) {
      for (const sourceId of created.sourceIds) {
        const result = await enqueueManualSourceRun(sourceId);
        if (result?.queued) {
          queuedSourceIds.push(sourceId);
        }
      }
    }

    reply.code(201);
    return {
      ...created,
      queuedSourceIds,
    };
  });

  app.patch<{ Params: { themeId: string } }>("/api/themes/:themeId", async (request, reply) => {
    const body = request.body as {
      name?: string;
      description?: string | null;
      status?: string;
    };

    if (body?.name === undefined && body?.description === undefined && body?.status === undefined) {
      reply.code(400);
      return { message: "At least one update field is required" };
    }

    const updated = await updateTheme(request.params.themeId, {
      name: body.name,
      description: body.description,
      status: body.status,
    });

    if (!updated) {
      reply.code(404);
      return { message: "Theme not found" };
    }

    return updated;
  });

  app.delete<{ Params: { themeId: string } }>("/api/themes/:themeId", async (request, reply) => {
    const deleted = await deleteTheme(request.params.themeId);

    if (!deleted) {
      reply.code(404);
      return { message: "Theme not found" };
    }

    return deleted;
  });
}
