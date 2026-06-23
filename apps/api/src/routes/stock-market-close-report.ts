import type { FastifyInstance } from "fastify";

import {
  getStockMarketCloseReport,
  getStockMarketCloseReportSnapshotByDate,
  getStockMarketCloseReportHistory,
  saveStockMarketCloseReportSnapshot,
  saveTodayStockMarketCloseReportIfNeeded,
  diagnoseStockMarketCloseReport,
} from "../services/stock-market-close-report-service.js";
import { getStockMarketAuthorityBrief } from "../services/stock-market-authority-brief-service.js";
import {
  deliverStockMarketCloseReport,
  getStockMarketCloseReportDeliveryConfig,
  updateStockMarketCloseReportDeliveryConfig,
  type StockMarketCloseReportDeliveryConfig,
} from "../services/stock-market-close-report-delivery.js";
import type { ChannelConfig } from "../services/notification-channels.js";

export async function registerStockMarketCloseReportRoutes(app: FastifyInstance) {
  app.get("/api/stock-market-report", async (_request, reply) => {
    const report = await getStockMarketCloseReport();

    if (!report) {
      const diagnosis = await diagnoseStockMarketCloseReport();
      reply.code(404);
      return { message: "Stock market close report not available", diagnosis };
    }

    return report;
  });

  app.get("/api/stock-market-report/authorities", async () => getStockMarketAuthorityBrief());

  app.get("/api/stock-market-report/diagnose", async () => diagnoseStockMarketCloseReport());

  app.get("/api/stock-market-report/history", async (request) => {
    const query = request.query as { limit?: string };
    let limit = query.limit ? parseInt(query.limit, 10) : 7;
    if (!Number.isInteger(limit) || limit <= 0) {
      limit = 7;
    }

    return getStockMarketCloseReportHistory(limit);
  });

  app.get("/api/stock-market-report/by-date", async (request, reply) => {
    const query = request.query as { date?: string };
    const date = query.date?.trim();

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      reply.code(400);
      return { message: "date must be in YYYY-MM-DD format" };
    }

    const snapshot = await getStockMarketCloseReportSnapshotByDate(date);
    if (!snapshot) {
      reply.code(404);
      return { message: "Stock market close report snapshot not found for this date" };
    }

    return snapshot;
  });

  app.post("/api/stock-market-report/save", async (_request, reply) => {
    const snapshot = await saveTodayStockMarketCloseReportIfNeeded();

    if (!snapshot) {
      reply.code(404);
      return { message: "Stock market close report not available" };
    }

    reply.code(201);
    return snapshot;
  });

  app.post("/api/stock-market-report/deliver", async (request, reply) => {
    const body = request.body as { channel?: string; channelConfig?: ChannelConfig } | undefined;
    const channel = (body?.channel as "in_app" | "email" | "webhook" | "telegram") ?? "in_app";

    const result = await deliverStockMarketCloseReport(channel, body?.channelConfig);

    if (!result.delivered) {
      reply.code(500);
      return { message: result.error ?? "Delivery failed" };
    }

    return result;
  });

  app.get("/api/stock-market-report/config", async () => getStockMarketCloseReportDeliveryConfig());

  app.put<{ Body: StockMarketCloseReportDeliveryConfig }>("/api/stock-market-report/config", async (request, reply) => {
    const body = request.body;

    if (typeof body?.enabled !== "boolean") {
      reply.code(400);
      return { message: "enabled must be a boolean" };
    }

    if (!body.channel || !["in_app", "email", "webhook", "telegram"].includes(body.channel)) {
      reply.code(400);
      return { message: "channel must be one of: in_app, email, webhook, telegram" };
    }

    if (!body.deliveryTime || !/^\d{2}:\d{2}$/.test(body.deliveryTime)) {
      reply.code(400);
      return { message: "deliveryTime must be in HH:MM format" };
    }

    return updateStockMarketCloseReportDeliveryConfig(body);
  });

  app.post("/api/stock-market-report", async (request, reply) => {
    const body = request.body as { report?: unknown } | undefined;
    if (!body?.report || typeof body.report !== "object") {
      reply.code(400);
      return { message: "report object is required" };
    }

    const snapshot = await saveStockMarketCloseReportSnapshot(body.report as any);
    reply.code(201);
    return snapshot;
  });
}
