import { afterAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe("daily summary integration", () => {
  it("daily summary endpoints fail without DATABASE_URL", async () => {
    const summary = await app.inject({
      method: "GET",
      url: "/api/daily-summary",
    });
    expect(summary.statusCode).toBe(500);
    expect(summary.body).toContain("DATABASE_URL");

    const history = await app.inject({
      method: "GET",
      url: "/api/daily-summary/history",
    });
    expect(history.statusCode).toBe(500);
    expect(history.body).toContain("DATABASE_URL");

    const compare = await app.inject({
      method: "GET",
      url: "/api/daily-summary/compare",
    });
    expect(compare.statusCode).toBe(500);
    expect(compare.body).toContain("DATABASE_URL");
  });

  it("daily summary config endpoints fail without DATABASE_URL", async () => {
    const getConfig = await app.inject({
      method: "GET",
      url: "/api/daily-summary/config",
    });
    expect(getConfig.statusCode).toBe(500);
    expect(getConfig.body).toContain("DATABASE_URL");

    const putConfig = await app.inject({
      method: "PUT",
      url: "/api/daily-summary/config",
      payload: {
        enabled: true,
        channel: "in_app",
        deliveryTime: "09:00",
      },
    });
    expect(putConfig.statusCode).toBe(500);
    expect(putConfig.body).toContain("DATABASE_URL");
  });
});
