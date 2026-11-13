import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { Histogram, registerRuntimeMetrics } from "./runtime-metrics.js";

describe("bounded runtime metrics", () => {
  it("exports cumulative histogram buckets", () => {
    const metric = new Histogram([0.01, 0.1]);
    metric.observe(0.005); metric.observe(0.05); metric.observe(1);
    const text = metric.render("latency_seconds");
    expect(text).toContain('latency_seconds_bucket{le="0.01"} 1');
    expect(text).toContain('latency_seconds_bucket{le="0.1"} 2');
    expect(text).toContain('latency_seconds_bucket{le="+Inf"} 3');
    expect(text).toContain("latency_seconds_count 3");
  });
  it("uses route templates and keeps metrics readable when database is unavailable", async () => {
    const app = Fastify();
    await registerRuntimeMetrics(app);
    app.get("/items/:id", () => ({ ok: true }));
    try {
      await app.inject("/items/private-one?token=secret");
      await app.inject("/items/private-two");
      const response = await app.inject("/api/metrics");
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('route="/items/:id"');
      expect(response.body).not.toContain("private-one");
      expect(response.body).not.toContain("secret");
      expect(response.body).toContain("info_monitor_database_up 0");
    } finally { await app.close(); }
  });
});
