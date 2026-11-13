import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getDatabase, executeTakeFirst } = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  executeTakeFirst: vi.fn(),
}));
vi.mock("../db/client.js", () => ({ getDatabase }));
import { registerHealthRoutes } from "./health.js";

const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  vi.resetAllMocks();
});

async function requestHealth(url: string) {
  const app = Fastify();
  apps.push(app);
  await registerHealthRoutes(app);
  return app.inject({ method: "GET", url });
}

describe("database readiness", () => {
  it.each(["/health", "/api/health"])("returns 503 on %s when the database is unavailable", async (url) => {
    getDatabase.mockReturnValue({ selectNoFrom: () => ({ executeTakeFirst }) });
    executeTakeFirst.mockRejectedValue(new Error("database password must not leak"));
    const response = await requestHealth(url);
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ status: "error", database: "unavailable" });
    expect(response.body).not.toContain("password");
  });

  it("returns 503 when database configuration is missing", async () => {
    getDatabase.mockImplementation(() => { throw new Error("DATABASE_URL is required"); });
    expect((await requestHealth("/api/health")).statusCode).toBe(503);
  });

  it("returns 200 after a successful database query", async () => {
    getDatabase.mockReturnValue({ selectNoFrom: () => ({ executeTakeFirst }) });
    executeTakeFirst.mockResolvedValue({ ok: 1 });
    const response = await requestHealth("/api/health");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", database: "available" });
    expect(executeTakeFirst).toHaveBeenCalledOnce();
  });
});
