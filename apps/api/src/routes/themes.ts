import type { FastifyInstance } from "fastify";

import {
  createTheme,
  deleteTheme,
  getThemeDailyActivity,
  getThemeDetail,
  getThemeReviewNote,
  listThemes,
  updateTheme,
  updateThemeReviewNote,
} from "../services/theme-service.js";
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

  app.get<{ Params: { themeId: string }; Querystring: { days?: string } }>(
    "/api/themes/:themeId/daily-activity",
    async (request, reply) => {
      const days = Math.min(30, Math.max(1, Number(request.query.days) || 7));
      const activity = await getThemeDailyActivity(request.params.themeId, days);

      if (!activity) {
        reply.code(404);
        return { message: "Theme not found" };
      }

      return activity;
    },
  );

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

  // Review notes endpoints
  app.get<{ Params: { themeId: string } }>("/api/themes/:themeId/review-note", async (request, reply) => {
    const note = await getThemeReviewNote(request.params.themeId);

    if (!note) {
      reply.code(404);
      return { message: "Theme not found" };
    }

    return note;
  });

  const VALID_REVIEW_STATUSES = ["pending_review", "reviewed", "tracking"];

  app.put<{
    Params: { themeId: string };
    Body: {
      content?: unknown;
      status?: unknown;
      tags?: unknown;
      nextReviewDate?: unknown;
    };
  }>("/api/themes/:themeId/review-note", async (request, reply) => {
    const body = request.body;

    if (typeof body?.content !== "string") {
      reply.code(400);
      return { message: "content must be a string" };
    }

    // Validate status
    let status: "pending_review" | "reviewed" | "tracking" | undefined;
    if (body.status !== undefined && body.status !== null) {
      if (typeof body.status !== "string" || !VALID_REVIEW_STATUSES.includes(body.status)) {
        reply.code(400);
        return { message: `status must be one of: ${VALID_REVIEW_STATUSES.join(", ")}` };
      }
      status = body.status as typeof status;
    }

    // Validate tags
    let tags: string[] | undefined;
    if (body.tags !== undefined && body.tags !== null) {
      if (!Array.isArray(body.tags) || !body.tags.every((t: unknown) => typeof t === "string")) {
        reply.code(400);
        return { message: "tags must be an array of strings" };
      }
      tags = body.tags;
    }

    // Validate nextReviewDate
    let nextReviewDate: string | null | undefined;
    if (body.nextReviewDate !== undefined) {
      if (body.nextReviewDate === null) {
        nextReviewDate = null;
      } else if (typeof body.nextReviewDate === "string" && !isNaN(Date.parse(body.nextReviewDate))) {
        nextReviewDate = body.nextReviewDate;
      } else {
        reply.code(400);
        return { message: "nextReviewDate must be a valid date string or null" };
      }
    }

    const updated = await updateThemeReviewNote(request.params.themeId, {
      content: body.content,
      status,
      tags,
      nextReviewDate,
    });

    if (!updated) {
      reply.code(404);
      return { message: "Theme not found" };
    }

    return updated;
  });
}
