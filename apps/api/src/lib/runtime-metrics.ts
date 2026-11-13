import { monitorEventLoopDelay } from "node:perf_hooks";
import type { FastifyInstance } from "fastify";
import { sql } from "kysely";
import { getDatabase, getDatabasePoolMetrics } from "../db/client.js";

import { Histogram, databaseQueryHistogram, getDatabaseQueryErrors } from "./database-metrics.js";
export { Histogram } from "./database-metrics.js";
const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');

export async function registerRuntimeMetrics(app: FastifyInstance) {
  const latencies = new Map<string, Histogram>();
  const requests = new Map<string, number>();
  const loop = monitorEventLoopDelay({ resolution: 20 }); loop.enable();
  app.addHook("onClose", async () => { loop.disable(); });
  app.addHook("onResponse", async (request, reply) => {
    const route = request.routeOptions.url ?? "__unmatched__";
    if (["/api/metrics", "/api/events/stream"].includes(route)) return;
    const method = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(request.method) ? request.method : "OTHER";
    const labels = `method="${method}",route="${escape(route)}"`;
    const histogram = latencies.get(labels) ?? new Histogram();
    histogram.observe(reply.elapsedTime / 1000); latencies.set(labels, histogram);
    const counter = `${labels},status="${reply.statusCode}"`;
    requests.set(counter, (requests.get(counter) ?? 0) + 1);
  });
  app.get("/api/metrics", async (_request, reply) => {
    let databaseUp = 1;
    let pending = 0; let running = 0; let expired = 0;
    try {
      const row = await getDatabase().selectFrom("source_runs")
        .select([
          sql<string>`count(*) filter (where status='pending')`.as("pending"),
          sql<string>`count(*) filter (where status='running')`.as("running"),
          sql<string>`count(*) filter (where status='running' and lease_expires_at<=now())`.as("expired"),
        ]).where("status", "in", ["pending", "running"]).executeTakeFirstOrThrow();
      pending = Number(row.pending); running = Number(row.running); expired = Number(row.expired);
    } catch { databaseUp = 0; }
    const memory = process.memoryUsage(); const cpu = process.cpuUsage(); const pool = getDatabasePoolMetrics();
    const gauge = (name: string, value: number, help: string) => [`# HELP ${name} ${help}`, `# TYPE ${name} gauge`, `${name} ${value}`].join("\n");
    const text = [
      "# HELP info_monitor_http_request_duration_seconds HTTP response latency by route template.",
      "# TYPE info_monitor_http_request_duration_seconds histogram",
      ...[...latencies].map(([labels, metric]) => metric.render("info_monitor_http_request_duration_seconds", labels)),
      "# HELP info_monitor_http_requests_total Completed HTTP requests by route template and status.",
      "# TYPE info_monitor_http_requests_total counter",
      ...[...requests].map(([labels, count]) => `info_monitor_http_requests_total{${labels}} ${count}`),
      "# HELP info_monitor_database_query_duration_seconds Database statement execution latency.",
      "# TYPE info_monitor_database_query_duration_seconds histogram",
      databaseQueryHistogram.render("info_monitor_database_query_duration_seconds"),
      "# HELP info_monitor_database_query_errors_total Database statement errors.",
      "# TYPE info_monitor_database_query_errors_total counter", `info_monitor_database_query_errors_total ${getDatabaseQueryErrors()}`,
      gauge("info_monitor_database_up", databaseUp, "Whether the database queue query succeeded."),
      gauge("info_monitor_database_pool_connections", pool.total, "Open database pool connections."),
      gauge("info_monitor_database_pool_idle", pool.idle, "Idle database pool connections."),
      gauge("info_monitor_database_pool_waiting", pool.waiting, "Requests waiting for a database pool connection."),
      "# HELP info_monitor_worker_runs Current queue rows by execution state.", "# TYPE info_monitor_worker_runs gauge",
      `info_monitor_worker_runs{state="pending"} ${pending}`, `info_monitor_worker_runs{state="running"} ${running}`, `info_monitor_worker_runs{state="expired"} ${expired}`,
      gauge("process_resident_memory_bytes", memory.rss, "Resident process memory."),
      gauge("process_heap_used_bytes", memory.heapUsed, "Used JavaScript heap."),
      gauge("process_uptime_seconds", process.uptime(), "Process uptime."),
      "# HELP process_cpu_seconds_total Process CPU time.", "# TYPE process_cpu_seconds_total counter", `process_cpu_seconds_total ${(cpu.user + cpu.system) / 1e6}`,
      gauge("info_monitor_event_loop_delay_p95_seconds", Number.isFinite(loop.percentile(95)) ? loop.percentile(95) / 1e9 : 0, "Process lifetime p95 event loop delay."),
    ].join("\n") + "\n";
    return reply.header("Cache-Control", "no-store").type("text/plain; version=0.0.4; charset=utf-8").send(text);
  });
}
