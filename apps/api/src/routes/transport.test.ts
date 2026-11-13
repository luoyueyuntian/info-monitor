import { afterAll, describe, expect, it } from "vitest";
import { gunzipSync, brotliDecompressSync } from "node:zlib";
import { buildApp } from "../app.js";
import { existsSync, readdirSync } from "node:fs";

const app = await buildApp();
app.get("/api/transport-test", () => ({ text: "repeat ".repeat(2000) }));
afterAll(() => app.close());

describe("HTTP transport", () => {
  it.each(["gzip", "br"])("compresses JSON with %s without changing its content", async (encoding) => {
    const raw = await app.inject("/api/transport-test");
    const response = await app.inject({ url: "/api/transport-test", headers: { "accept-encoding": encoding } });
    expect(response.headers["content-encoding"]).toBe(encoding);
    expect(response.headers.vary).toContain("accept-encoding");
    expect(response.rawPayload.length).toBeLessThan(raw.rawPayload.length / 5);
    const decompressed = encoding === "gzip" ? gunzipSync(response.rawPayload) : brotliDecompressSync(response.rawPayload);
    expect(decompressed.toString()).toBe(raw.body);
  });
  it("keeps the SPA fresh, caches hashed assets, and rejects missing assets", async () => {
    const assets = new URL("../../../frontend/dist/assets/", import.meta.url);
    if (!existsSync(assets)) return; // Source-only CI need not have built frontend assets.
    expect((await app.inject("/events")).headers["cache-control"]).toBe("no-cache");
    const file = readdirSync(assets).find((name) => name.endsWith(".js"))!;
    expect((await app.inject(`/assets/${file}`)).headers["cache-control"]).toContain("immutable");
    expect((await app.inject("/assets/missing-file.js")).statusCode).toBe(404);
  });
});
