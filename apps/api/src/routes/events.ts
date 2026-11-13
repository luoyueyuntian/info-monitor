import { getEventArticle } from "../services/article-service.js";
import type { FastifyInstance } from "fastify";
import type { EventPageQuery } from "@info-monitor/shared-contracts";
import { listCompactEvents, listEventPage } from "../services/event-list-service.js";

import {
  getEventDetail,
  getEventFeedback,
  getFeedbackAggregation,
  inboxSectionIds,
  listInboxSectionEvents,
  upsertEventFeedback,
  deleteEventFeedback,
  updateEventState,
  type EventFeedback,
} from "../services/event-service.js";

export async function registerEventRoutes(app: FastifyInstance) {
  app.get<{ Params: { sectionId: string } }>("/api/inbox/sections/:sectionId/events", async (request, reply) => {
    if (!inboxSectionIds.includes(request.params.sectionId as (typeof inboxSectionIds)[number])) {
      reply.code(404);
      return { message: "Inbox section not found" };
    }

    return listInboxSectionEvents(request.params.sectionId);
  });

  app.get<{ Querystring: { view?: string } }>("/api/events", async (request) =>
    request.query.view === "compact" ? listCompactEvents() : listInboxSectionEvents());

  app.get<{ Querystring: EventPageQuery }>("/api/events/page", {
    schema: { querystring: {
      type: "object", additionalProperties: false,
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 200 },
        cursor: { type: "string", minLength: 1, maxLength: 2048 },
        q: { type: "string", maxLength: 200 }, themeId: { type: "string", minLength: 1, maxLength: 4000 },
        status: { type: "string", enum: ["all", "open", "tracking", "ignored"] },
        type: { type: "string", enum: ["all", "price", "content_update", "news_announcement", "financial_event"] },
        impact: { type: "string", enum: ["all", "positive", "negative", "neutral"] },
        read: { type: "string", enum: ["all", "read", "unread"] },
        bookmark: { type: "string", enum: ["all", "bookmarked"] },
        sort: { type: "string", enum: ["occurredAt", "bookmarkedAt", "statusChanged"] },
        recent: { type: "string", enum: ["24h"] }, since: { type: "string", format: "date-time" },
      },
    } },
  }, async (request) => listEventPage(request.query));

  app.get<{ Params: { eventId: string } }>("/api/events/:eventId", async (request, reply) => {
    const event = await getEventDetail(request.params.eventId);

    if (!event) {
      reply.code(404);
      return { message: "Event not found" };
    }

    return event;
  });

  app.get<{ Params: { eventId: string } }>("/api/events/:eventId/article", async (request, reply) => {
    const article = await getEventArticle(request.params.eventId);
    if (!article) { reply.code(404); return { message: "Event not found" }; }
    return article;
  });
  app.post<{ Params: { eventId: string }; Body: { retry?: boolean } }>("/api/events/:eventId/article", {
    schema: { body: { type: "object", additionalProperties: false, properties: { retry: { type: "boolean" } } } },
  }, async (request, reply) => {
    const article = await getEventArticle(request.params.eventId, { request: true, retry: request.body?.retry });
    if (!article) { reply.code(404); return { message: "Event not found" }; }
    return article;
  });

  app.patch<{ Params: { eventId: string } }>("/api/events/:eventId", async (request, reply) => {
    const body = request.body as {
      status?: string;
      isRead?: boolean;
      isBookmarked?: boolean;
    };

    if (
      typeof body?.status !== "string" &&
      typeof body?.isRead !== "boolean" &&
      typeof body?.isBookmarked !== "boolean"
    ) {
      reply.code(400);
      return { message: "at least one event field is required" };
    }

    const updated = await updateEventState(request.params.eventId, {
      status: body.status,
      isRead: body.isRead,
      isBookmarked: body.isBookmarked,
    });

    if (!updated) {
      reply.code(404);
      return { message: "Event not found" };
    }

    return updated;
  });

  // Event feedback endpoints
  app.get<{ Params: { eventId: string } }>("/api/events/:eventId/feedback", async (request, reply) => {
    const feedback = await getEventFeedback(request.params.eventId);

    if (!feedback) {
      reply.code(404);
      return { message: "No feedback found for this event" };
    }

    return feedback;
  });

  app.put<{
    Params: { eventId: string };
    Body: { feedback?: unknown; note?: unknown };
  }>("/api/events/:eventId/feedback", async (request, reply) => {
    const body = request.body;

    if (!body?.feedback || !["useful", "noise", "watch"].includes(body.feedback as string)) {
      reply.code(400);
      return { message: "feedback must be one of: useful, noise, watch" };
    }

    // Validate note: must be string, null, or undefined
    let note: string | undefined;
    if (body.note !== undefined && body.note !== null) {
      if (typeof body.note !== "string") {
        reply.code(400);
        return { message: "note must be a string or null" };
      }
      note = body.note;
    }

    const result = await upsertEventFeedback(
      request.params.eventId,
      body.feedback as EventFeedback,
      note,
    );

    if (!result) {
      reply.code(404);
      return { message: "Event not found" };
    }

    return result;
  });

  app.delete<{ Params: { eventId: string } }>("/api/events/:eventId/feedback", async (request) => {
    await deleteEventFeedback(request.params.eventId);
    return { success: true };
  });

  // Feedback aggregation endpoint
  app.get("/api/events/feedback/stats", async () => getFeedbackAggregation());
}
