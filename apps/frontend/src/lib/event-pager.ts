import { computed, ref, shallowRef } from "vue";
import type { EventPage, EventPageQuery, EventSummary } from "@info-monitor/shared-contracts";

export function createEventPager(load: (query: EventPageQuery, signal: AbortSignal) => Promise<EventPage>) {
  const items = shallowRef<EventSummary[]>([]);
  const total = ref(0);
  const page = ref(1);
  const loading = ref(false);
  const error = ref("");
  let filters: EventPageQuery = {};
  let cursors: (string | undefined)[] = [undefined];
  let nextCursor: string | null = null;
  let controller: AbortController | undefined;
  let generation = 0;

  async function request(target: number) {
    const current = ++generation;
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = "";
    try {
      const result = await load({ ...filters, limit: 50, cursor: cursors[target - 1] }, controller.signal);
      if (current !== generation) return;
      items.value = result.items;
      total.value = result.total;
      nextCursor = result.nextCursor;
      page.value = target;
    } catch (cause) {
      if (current === generation && !(cause instanceof Error && cause.name === "AbortError")) {
        error.value = cause instanceof Error ? cause.message : "事件加载失败";
      }
    } finally {
      if (current === generation) loading.value = false;
    }
  }
  async function reset(query: EventPageQuery) {
    filters = { ...query };
    cursors = [undefined];
    nextCursor = null;
    page.value = 1;
    items.value = [];
    total.value = 0;
    return request(1);
  }
  const canNext = computed(() => !loading.value && nextCursor !== null);
  const canPrevious = computed(() => !loading.value && page.value > 1);
  async function next() {
    if (!canNext.value) return;
    cursors[page.value] = nextCursor!;
    return request(page.value + 1);
  }
  async function previous() {
    if (canPrevious.value) return request(page.value - 1);
  }
  function dispose() { generation++; controller?.abort(); loading.value = false; }
  return { items, total, page, loading, error, canNext, canPrevious, reset, next, previous,
    refresh: () => reset(filters), dispose };
}
