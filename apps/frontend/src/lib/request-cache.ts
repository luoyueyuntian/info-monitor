const values = new Map<string, { value: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
let generation = 0;

export function invalidateReadCache() {
  generation++;
  values.clear();
  pending.clear();
}

export async function cachedRead<T>(key: string, load: () => Promise<T>, ttl = 15_000): Promise<T> {
  const entry = values.get(key);
  if (entry && entry.expires > Date.now()) return structuredClone(entry.value) as T;
  let request = pending.get(key) as Promise<T> | undefined;
  if (!request) {
    const epoch = generation;
    request = Promise.resolve().then(load).then((value) => {
      if (generation === epoch) values.set(key, { value, expires: Date.now() + ttl });
      return value;
    });
    pending.set(key, request);
    const current = request;
    // Both outcomes clean up without creating an unhandled rejected promise.
    request.then(() => { if (pending.get(key) === current) pending.delete(key); },
      () => { if (pending.get(key) === current) pending.delete(key); });
  }
  return structuredClone(await request);
}
