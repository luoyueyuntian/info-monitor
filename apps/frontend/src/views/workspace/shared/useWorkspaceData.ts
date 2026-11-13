import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from "vue";
import type { WorkspaceDataResponse, ThemeSummary, SourceStatus } from "@info-monitor/shared-contracts";
import { fetchWorkspaceData } from "../../../lib/api";
import { getWorkspaceDefinition, workspaceDefinitions, type WorkspaceDataset, type WorkspaceId, workspaceReferenceNow } from "../../../lib/workspaces";

export function useWorkspaceData(workspaceId: WorkspaceId | Ref<WorkspaceId>) {
  const data = shallowRef<WorkspaceDataResponse | null>(null);
  const catalogThemes = shallowRef<ThemeSummary[]>([]);
  const catalogSources = shallowRef<SourceStatus[]>([]);
  const loading = ref(false);
  const error = ref("");
  const currentWorkspaceId = computed(() => typeof workspaceId === "string" ? workspaceId : workspaceId.value);
  const workspace = computed(() => getWorkspaceDefinition(currentWorkspaceId.value));
  const dataset = computed<WorkspaceDataset>(() => ({
    workspace: workspace.value ?? workspaceDefinitions[0], themes: data.value?.themes ?? [], events: data.value?.events ?? [], sources: data.value?.sources ?? [],
  }));
  const referenceNow = computed(() => workspaceReferenceNow(dataset.value));
  let generation = 0;
  let disposed = false;
  async function load() {
    const request = ++generation;
    const id = currentWorkspaceId.value;
    loading.value = true; error.value = "";
    try {
      const result = await fetchWorkspaceData(id);
      if (!disposed && request === generation && id === currentWorkspaceId.value) {
        data.value = result; catalogThemes.value = result.allThemes; catalogSources.value = result.allSources;
      }
    } catch (cause) {
      if (!disposed && request === generation) error.value = cause instanceof Error ? cause.message : "工作区加载失败";
      throw cause;
    } finally {
      if (!disposed && request === generation) loading.value = false;
    }
  }
  watch(currentWorkspaceId, () => { data.value = null; void load().catch(() => {}); });
  onScopeDispose(() => { disposed = true; generation++; });
  return { workspace, dataset, referenceNow, loading, error, load,
    allEvents: computed(() => data.value?.events ?? []),
    allThemes: catalogThemes,
    allSources: catalogSources,
  };
}
