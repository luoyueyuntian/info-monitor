<template>
  <section class="page">
    <div class="mb-6">
      <h1>搜索</h1>
      <p class="text-[0.92rem] text-ink-secondary">搜索事件、通知和主题</p>
    </div>

    <div class="mb-6">
      <div class="flex items-center gap-2 rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-3 transition-colors focus-within:border-[#6b4f1f]/30 focus-within:bg-white">
        <svg class="h-5 w-5 shrink-0 text-ink-muted" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
        </svg>
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          placeholder="输入关键词搜索..."
          class="flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-ink-muted"
          @keydown.enter="doSearch"
        />
        <button
          v-if="query"
          class="rounded-xl bg-btn-primary px-4 py-1.5 text-[0.84rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
          @click="doSearch"
        >
          搜索
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-ink-secondary">搜索中...</div>

    <div
      v-else-if="error"
      class="rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-[0.88rem] text-rose-700"
    >
      {{ error }}
    </div>

    <div v-else-if="hasSearched && result.hits.length === 0" class="rounded-2xl border border-dashed border-slate-400/30 p-8 text-center text-ink-secondary">
      没有找到匹配 "{{ result.query }}" 的结果
    </div>

    <div v-else-if="result.hits.length > 0" class="grid gap-3">
      <div class="mb-2 text-[0.84rem] text-ink-secondary">
        找到 {{ result.hits.length }} 条结果 ({{ result.processingTimeMs }}ms)
      </div>

      <RouterLink
        v-for="hit in result.hits"
        :key="`${hit.type}-${hit.id}`"
        :to="hitLink(hit)"
        class="rounded-2xl border border-slate-400/15 bg-white/70 px-4 py-3.5 transition-colors hover:bg-white"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-full px-2.5 py-0.5 text-[0.76rem] font-semibold uppercase tracking-[0.06em]"
            :class="typeBadgeClass(hit.type)"
          >
            {{ typeLabel(hit.type) }}
          </span>
          <span v-if="hit.signal" class="rounded-full bg-slate-100 px-2 py-0.5 text-[0.76rem] text-ink-secondary">
            {{ hit.signal }}
          </span>
        </div>
        <div class="mt-2 text-[0.95rem] font-semibold text-ink-heading">{{ hit.title }}</div>
        <div v-if="hit.summary" class="mt-1 text-[0.88rem] leading-6 text-ink-body">{{ hit.summary }}</div>
        <div v-if="hit.themeName" class="mt-1.5 text-[0.82rem] text-ink-muted">{{ hit.themeName }}</div>
      </RouterLink>
    </div>

    <div v-else class="rounded-2xl border border-dashed border-slate-400/30 p-8 text-center text-ink-secondary">
      输入关键词开始搜索
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { type SearchHit, type SearchResult, searchQuery } from "../../lib/api";

const route = useRoute();
const searchInput = ref<HTMLInputElement | null>(null);
const query = ref("");
const loading = ref(false);
const hasSearched = ref(false);
const result = ref<SearchResult>({ hits: [], query: "", processingTimeMs: 0 });
const error = ref("");

async function doSearch() {
  if (!query.value.trim()) return;
  loading.value = true;
  hasSearched.value = true;
  error.value = "";
  try {
    result.value = await searchQuery(query.value.trim());
  } catch (e) {
    result.value = { hits: [], query: query.value.trim(), processingTimeMs: 0 };
    error.value = e instanceof Error ? e.message : "搜索失败";
  } finally {
    loading.value = false;
  }
}

function hitLink(hit: SearchHit): string {
  switch (hit.type) {
    case "event": return `/events/${hit.id}`;
    case "notification": return `/notifications`;
    case "theme": return `/themes/${hit.id}`;
    default: return `/search?q=${encodeURIComponent(query.value)}`;
  }
}

function typeBadgeClass(type: string): string {
  switch (type) {
    case "event": return "bg-blue-50 text-blue-700";
    case "notification": return "bg-amber-50 text-amber-700";
    case "theme": return "bg-emerald-50 text-emerald-700";
    case "record": return "bg-purple-50 text-purple-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case "event": return "事件";
    case "notification": return "通知";
    case "theme": return "主题";
    case "record": return "记录";
    default: return type;
  }
}

onMounted(() => {
  const q = route.query.q;
  if (typeof q === "string" && q.trim()) {
    query.value = q.trim();
    void doSearch();
  }
  nextTick(() => searchInput.value?.focus());
});

watch(() => route.query.q, (q) => {
  if (typeof q === "string" && q.trim() && q.trim() !== query.value) {
    query.value = q.trim();
    void doSearch();
  }
});
</script>
