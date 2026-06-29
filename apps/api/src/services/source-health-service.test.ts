import { describe, expect, it } from "vitest";

import { getOperationalMetrics, getSourceHealthStats } from "./source-health-service.js";

describe("source-health-service", () => {
  it("requires DATABASE_URL for source health stats", async () => {
    await expect(getSourceHealthStats()).rejects.toThrow(/DATABASE_URL/);
  });

  it("requires DATABASE_URL for operational metrics", async () => {
    await expect(getOperationalMetrics()).rejects.toThrow(/DATABASE_URL/);
  });
});
