import { afterAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe("notification routes", () => {
  it("rejects invalid status filters", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/notifications?status=typo",
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid status updates", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/notifications/notification-surface-low",
      payload: {
        status: "typo",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects non-positive limits", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/notifications?limit=0",
    });

    expect(response.statusCode).toBe(400);
  });
});
