import { WORKSPACE_IDS, selectWorkspaceDataset, buildWorkspaceSummary, sortWorkspaceEvents, workspaceReferenceNow } from "@info-monitor/shared-contracts";
import type { WorkspaceId, WorkspaceDataResponse, WorkspaceIndexResponse } from "@info-monitor/shared-contracts";
import { listThemes } from "./theme-service.js";
import { listSourceStatuses } from "./source-service.js";
import { listCompactEvents } from "./event-list-service.js";

type Base = { themes: Awaited<ReturnType<typeof listThemes>>; sources: Awaited<ReturnType<typeof listSourceStatuses>>; events: Awaited<ReturnType<typeof listCompactEvents>> };
let cache: Promise<Base> | undefined;
let expires = 0;
let generation = 0;
export function invalidateWorkspaceCache() { generation++; cache = undefined; expires = 0; }
async function getBase(): Promise<Base> {
  if (cache && expires > Date.now()) return cache;
  const epoch = generation;
  expires = Infinity;
  const request = Promise.all([listThemes(), listCompactEvents(), listSourceStatuses()])
    .then(([themes, events, sources]) => {
      if (epoch === generation && cache === request) expires = Date.now() + 5000;
      return { themes, events, sources };
    });
  cache = request;
  request.catch(() => { if (cache === request) invalidateWorkspaceCache(); });
  return request;
}
type Derived = { scopes: Map<WorkspaceId, WorkspaceDataResponse>; index: WorkspaceIndexResponse };
const derived = new WeakMap<Base, Derived>();
function getDerived(base: Base): Derived {
  const existing = derived.get(base);
  if (existing) return existing;
  const scopes = new Map<WorkspaceId, WorkspaceDataResponse>();
  for (const id of WORKSPACE_IDS) {
    const scoped = selectWorkspaceDataset(id, base.themes, base.events, base.sources);
    scopes.set(id, { ...scoped, allThemes: base.themes, allSources: base.sources,
      referenceNow: workspaceReferenceNow(scoped).toISOString() });
  }
  const index: WorkspaceIndexResponse = {
    referenceNow: workspaceReferenceNow(base).toISOString(),
    workspaces: WORKSPACE_IDS.map((id) => {
      const scoped = scopes.get(id)!;
      return { id, summary: buildWorkspaceSummary(scoped), topEvents: sortWorkspaceEvents(scoped.events).slice(0, 3) };
    }),
  };
  const result = { scopes, index };
  derived.set(base, result);
  return result;
}
export async function getWorkspaceData(id: WorkspaceId): Promise<WorkspaceDataResponse> {
  return getDerived(await getBase()).scopes.get(id)!;
}
export async function getWorkspaceIndex(): Promise<WorkspaceIndexResponse> {
  return getDerived(await getBase()).index;
}
