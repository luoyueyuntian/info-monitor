import { getConfig } from "../config.js";

export type SearchHit = {
  id: string;
  type: "event" | "notification" | "theme" | "record";
  title: string;
  summary?: string;
  themeId?: string;
  themeName?: string;
  signal?: string;
  infoType?: string;
  updatedAt?: string;
};

export type SearchResult = {
  hits: SearchHit[];
  query: string;
  processingTimeMs: number;
};

import { getDatabase } from "../db/client.js";

// --- Meilisearch client ---

type MeiliIndex = {
  search: (query: string, opts?: Record<string, unknown>) => Promise<{ hits: Record<string, unknown>[] }>;
  addDocuments: (docs: Record<string, unknown>[]) => Promise<unknown>;
};

type MeiliClient = {
  index: (name: string) => MeiliIndex;
  getHealth: () => Promise<unknown>;
};

let meiliClient: MeiliClient | null = null;

async function getMeiliClient(): Promise<MeiliClient | null> {
  if (meiliClient) return meiliClient;

  const config = getConfig();
  const host = config.meiliHost || undefined;
  const apiKey = config.meiliApiKey || undefined;

  if (!host) return null;

  try {
    const mod = await import("meilisearch") as Record<string, unknown>;
    const Meilisearch = (mod.Meilisearch ?? mod.default) as new (opts: { host: string; apiKey?: string }) => MeiliClient;
    meiliClient = new Meilisearch({ host, apiKey: apiKey ?? undefined });
    return meiliClient;
  } catch {
    return null;
  }
}

async function searchMeili(query: string, type?: string, themeId?: string): Promise<SearchResult> {
  const client = await getMeiliClient();
  if (!client) {
    throw new Error("Search backend is unavailable. Configure Meilisearch before using search.");
  }

  const indexName = type === "event" ? "events"
    : type === "notification" ? "notifications"
    : type === "theme" ? "themes"
    : type === "record" ? "normalized_records"
    : undefined;

  const start = Date.now();

  try {
    if (indexName) {
      const index = client.index(indexName);
      const filter = themeId ? `themeId = "${themeId}"` : undefined;
      const result = await index.search(query, { filter, limit: 20 });
      const hits: SearchHit[] = result.hits.map((hit) => ({
        id: hit.id as string,
        type: indexName === "normalized_records" ? "record" as const : indexName.slice(0, -1) as SearchHit["type"],
        title: (hit.title ?? hit.name ?? "") as string,
        summary: hit.summary as string | undefined,
        themeId: hit.themeId as string | undefined,
        themeName: hit.themeName as string | undefined,
        signal: hit.signal as string | undefined,
        infoType: hit.infoType as string | undefined,
      }));
      return { hits, query, processingTimeMs: Date.now() - start };
    }

    // Multi-index search
    const [eventsRes, notifsRes, themesRes] = await Promise.all([
      client.index("events").search(query, { limit: 8 }),
      client.index("notifications").search(query, { limit: 8 }),
      client.index("themes").search(query, { limit: 4 }),
    ]);

    const hits: SearchHit[] = [
      ...eventsRes.hits.map((hit) => ({
        id: hit.id as string, type: "event" as const, title: hit.title as string,
        signal: hit.signal as string | undefined, themeId: hit.themeId as string | undefined, themeName: hit.themeName as string | undefined,
      })),
      ...notifsRes.hits.map((hit) => ({
        id: hit.id as string, type: "notification" as const, title: hit.title as string,
        summary: hit.summary as string | undefined, signal: hit.signal as string | undefined, themeId: hit.themeId as string | undefined, themeName: hit.themeName as string | undefined,
      })),
      ...themesRes.hits.map((hit) => ({
        id: hit.id as string, type: "theme" as const, title: hit.name as string,
        summary: hit.description as string | undefined,
      })),
    ];

    return { hits: hits.slice(0, 20), query, processingTimeMs: Date.now() - start };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Search request failed.");
  }
}

export async function search(query: string, type?: string, themeId?: string): Promise<SearchResult> {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL is required. Runtime mock mode has been removed.");
  }

  return searchMeili(query, type, themeId);
}
