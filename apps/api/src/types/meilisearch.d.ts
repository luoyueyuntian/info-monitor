declare module "meilisearch" {
  export class Meilisearch {
    constructor(opts: { host: string; apiKey?: string });
    index(name: string): {
      search(query: string, opts?: Record<string, unknown>): Promise<{ hits: Record<string, unknown>[] }>;
      addDocuments(docs: Record<string, unknown>[]): Promise<unknown>;
    };
    getHealth(): Promise<unknown>;
  }

  export default Meilisearch;
}
