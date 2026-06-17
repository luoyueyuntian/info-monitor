import { computed, ref, type Ref } from "vue";

import { fetchEvents, fetchSourceStatuses, fetchThemes, type EventSummary, type SourceStatus, type ThemeSummary } from "../../../lib/api";
import { buildWorkspaceDataset, getWorkspaceDefinition, type WorkspaceId, workspaceReferenceNow } from "../../../lib/workspaces";

export function useWorkspaceData(workspaceId: WorkspaceId | Ref<WorkspaceId>) {
  const themes = ref<ThemeSummary[]>([]);
  const events = ref<EventSummary[]>([]);
  const sources = ref<SourceStatus[]>([]);
  const loading = ref(false);

  const currentWorkspaceId = computed(() => typeof workspaceId === "string" ? workspaceId : workspaceId.value);
  const workspace = computed(() => getWorkspaceDefinition(currentWorkspaceId.value));
  const dataset = computed(() => buildWorkspaceDataset(currentWorkspaceId.value, themes.value, events.value, sources.value));
  const referenceNow = computed(() => workspaceReferenceNow(dataset.value));

  async function load() {
    loading.value = true;

    try {
      const [nextThemes, nextEvents, nextSources] = await Promise.all([
        fetchThemes(),
        fetchEvents(),
        fetchSourceStatuses(),
      ]);

      themes.value = nextThemes;
      events.value = nextEvents;
      sources.value = nextSources;
    } finally {
      loading.value = false;
    }
  }

  return {
    workspace,
    dataset,
    allSources: sources,
    allThemes: themes,
    referenceNow,
    loading,
    load,
  };
}
