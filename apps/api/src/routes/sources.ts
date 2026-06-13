import type { FastifyInstance } from "fastify";

import { createSource, deleteSource, enqueueManualSourceRun, enqueueTestSourceRun, getSourceDetail, getSourceTestRunPreview, listSourceStatuses, retrySourceAfterFailure, sourcePresets, updateSource, validateSourceConfig } from "../services/source-service.js";

export async function registerSourceRoutes(app: FastifyInstance) {
  app.get("/api/sources/status", async () => listSourceStatuses());

  app.get("/api/sources/presets", async () => sourcePresets);

  app.get<{ Params: { sourceId: string } }>("/api/sources/:sourceId", async (request, reply) => {
    const detail = await getSourceDetail(request.params.sourceId);

    if (!detail) {
      reply.code(404);
      return { message: "Source not found" };
    }

    return detail;
  });

  app.post("/api/sources/validate", async (request) => {
    const body = request.body as {
      presetId?: string;
      adapterKey?: string;
      sourceType?: string;
      config?: Record<string, unknown>;
      name?: string;
    };

    return validateSourceConfig(body);
  });

  app.post("/api/sources", async (request, reply) => {
    const body = request.body as {
      themeId?: string;
      name?: string;
      sourceType?: string;
      adapterKey?: string;
      config?: Record<string, unknown>;
      onboardingStatus?: "draft" | "ready_to_test" | "active";
    };

    if (!body?.themeId || !body.name || !body.sourceType || !body.adapterKey) {
      reply.code(400);
      return { message: "themeId, name, sourceType, and adapterKey are required" };
    }

    const created = await createSource({
      themeId: body.themeId,
      name: body.name,
      sourceType: body.sourceType,
      adapterKey: body.adapterKey,
      config: body.config,
      onboardingStatus: body.onboardingStatus,
    });

    reply.code(201);
    return created;
  });

  app.post<{ Params: { sourceId: string } }>("/api/sources/:sourceId/runs", async (request, reply) => {
    const result = await enqueueManualSourceRun(request.params.sourceId);

    if (!result) {
      reply.code(404);
      return { message: "Source not found" };
    }

    reply.code(202);
    return result;
  });

  app.post<{ Params: { sourceId: string } }>("/api/sources/:sourceId/test-run", async (request, reply) => {
    const result = await enqueueTestSourceRun(request.params.sourceId);

    if (!result) {
      reply.code(404);
      return { message: "Source not found" };
    }

    reply.code(202);
    return result;
  });

  app.get<{ Params: { sourceId: string } }>("/api/sources/:sourceId/test-preview", async (request, reply) => {
    const preview = await getSourceTestRunPreview(request.params.sourceId);

    if (!preview) {
      reply.code(404);
      return { message: "No test run found for this source" };
    }

    return preview;
  });

  app.post<{ Params: { sourceId: string; runId: string } }>("/api/sources/:sourceId/runs/:runId/retry", async (request, reply) => {
    const result = await retrySourceAfterFailure(request.params.sourceId, request.params.runId);

    if (!result) {
      reply.code(404);
      return { message: "Source or run not found" };
    }

    if ("rejected" in result && result.rejected) {
      reply.code(409);
      return result;
    }

    reply.code(202);
    return result;
  });

  app.patch<{ Params: { sourceId: string } }>("/api/sources/:sourceId", async (request, reply) => {
    const body = request.body as {
      name?: string;
      sourceType?: string;
      adapterKey?: string;
      config?: Record<string, unknown>;
      isPaused?: boolean;
      onboardingStatus?: "draft" | "ready_to_test" | "active";
    };

    if (
      body?.name === undefined &&
      body?.sourceType === undefined &&
      body?.adapterKey === undefined &&
      body?.config === undefined &&
      body?.isPaused === undefined &&
      body?.onboardingStatus === undefined
    ) {
      reply.code(400);
      return { message: "At least one update field is required" };
    }

    const updated = await updateSource(request.params.sourceId, {
      name: body.name,
      sourceType: body.sourceType,
      adapterKey: body.adapterKey,
      config: body.config,
      isPaused: body.isPaused,
      onboardingStatus: body.onboardingStatus,
    });

    if (!updated) {
      reply.code(404);
      return { message: "Source not found" };
    }

    return updated;
  });

  app.delete<{ Params: { sourceId: string } }>("/api/sources/:sourceId", async (request, reply) => {
    const deleted = await deleteSource(request.params.sourceId);

    if (!deleted) {
      reply.code(404);
      return { message: "Source not found" };
    }

    return deleted;
  });
}
