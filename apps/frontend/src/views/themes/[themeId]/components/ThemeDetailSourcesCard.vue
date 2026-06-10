<template>
  <article class="card">
    <div class="card-topline">
      <h3>来源</h3>
      <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]" :to="{ path: '/sources/status', query: { themeId } }">
        查看本主题来源状态
        <span aria-hidden="true" class="text-base leading-none">›</span>
      </RouterLink>
    </div>
    <div class="flex flex-col gap-3">
      <div v-for="source in sources" :key="source.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass(source.status)">{{ sourceStatusLabel(source.status) }}</span>
          <span :class="pillToneClass('neutral')" v-if="source.isPaused">已暂停</span>
          <span :class="pillToneClass(source.latestRunStatus)" v-if="source.latestRunStatus">
            {{ runStatusLabel(source.latestRunStatus) }}
          </span>
        </div>
        <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]" :to="`/sources/${source.id}`">
          {{ source.name }}
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-[#766f63]">暂停: {{ source.isPaused ? "是" : "否" }}</span>
          <span class="text-[0.88rem] text-[#766f63]">来源类型: {{ formatMaybeLabel(source.sourceType) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">Adapter: {{ formatMaybeLabel(source.adapterKey) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">最近运行: {{ formatDateTimeLabel(source.latestRunAt) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">最近成功: {{ formatDateTimeLabel(source.latestSuccessAt) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">最近失败: {{ formatDateTimeLabel(source.latestFailureAt) }}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: '/sources/status', query: { themeId, focus: source.status === 'warning' ? 'warning' : undefined } }"
          >
            在来源状态页查看
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: '/events', query: { themeId, sort: 'occurredAt' } }"
          >
            查看相关事件
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: `/themes/${themeId}`, query: { section: source.status === 'warning' ? 'analysis' : 'timeline' } }"
          >
            {{ source.status === "warning" ? "查看主题分析" : "查看主题时间线" }}
          </RouterLink>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]"
            type="button"
            @click="toggleEditSource(source)"
          >
            {{ editingSourceId === source.id ? "收起编辑" : "编辑来源" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="togglingSourceId === source.id"
            @click="toggleSourcePaused(source.id, !source.isPaused)"
          >
            {{
              togglingSourceId === source.id
                ? "正在更新..."
                : source.isPaused
                  ? "恢复来源"
                  : "暂停来源"
            }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="deletingSourceId === source.id"
            @click="deleteSourceItem(source.id)"
          >
            {{ deletingSourceId === source.id ? "正在删除..." : "删除来源" }}
          </button>
        </div>
        <form v-if="editingSourceId === source.id" class="grid gap-4 source-inline-form" @submit.prevent="saveSource(source.id)">
          <div class="grid gap-4 md:grid-cols-2">
            <label>
              来源名称
              <input v-model="editSourceForm.name" placeholder="来源名称" />
            </label>
            <label>
              来源类型
              <select v-model="editSourceForm.sourceType">
                <option value="page_list">page_list</option>
                <option value="api">api</option>
                <option value="rss">rss</option>
              </select>
            </label>
          </div>
          <label>
            Adapter Key
            <input v-model="editSourceForm.adapterKey" placeholder="adapter_key" />
          </label>
          <label>
            Config JSON
            <textarea
              v-model="editSourceForm.configJson"
              placeholder='{"path": "/example", "schedule_interval_seconds": 21600}'
            ></textarea>
          </label>
          <div class="flex flex-wrap gap-3">
            <button class="inline-flex items-center justify-center rounded-xl bg-[#2f2618] px-4 py-2.5 text-[#fff7e7] transition-colors hover:bg-[#241d12] disabled:cursor-not-allowed disabled:opacity-60" type="submit" :disabled="savingSourceId === source.id">
              {{ savingSourceId === source.id ? "正在保存..." : "保存修改" }}
            </button>
            <button class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" type="button" @click="cancelEditingSource">取消</button>
          </div>
          <div v-if="editSourceStatus" class="text-[#6f665a]">{{ editSourceStatus }}</div>
        </form>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";

import type { ThemeDetail } from "../../../../lib/api";
import {
  formatDateTimeLabel,
  formatMaybeLabel,
  pillToneClass,
  runStatusLabel,
  sourceStatusLabel,
} from "../../../../lib/presentation";

const props = defineProps<{
  themeId: string;
  sources: ThemeDetail["sources"];
  onToggleSourcePaused: (sourceId: string, isPaused: boolean) => Promise<void>;
  onDeleteSource: (sourceId: string) => Promise<void>;
  onSaveSource: (
    sourceId: string,
    input: {
      name: string;
      sourceType: string;
      adapterKey: string;
      configJson: string;
    },
  ) => Promise<void>;
}>();

const editingSourceId = ref<string | null>(null);
const togglingSourceId = ref<string | null>(null);
const deletingSourceId = ref<string | null>(null);
const savingSourceId = ref<string | null>(null);
const editSourceStatus = ref("");
const editSourceForm = reactive({
  name: "",
  sourceType: "page_list",
  adapterKey: "",
  configJson: "{}",
});

function toggleEditSource(source: ThemeDetail["sources"][number]) {
  if (editingSourceId.value === source.id) {
    cancelEditingSource();
    return;
  }

  editingSourceId.value = source.id;
  editSourceStatus.value = "";
  editSourceForm.name = source.name;
  editSourceForm.sourceType = source.sourceType ?? "page_list";
  editSourceForm.adapterKey = source.adapterKey ?? "";
  editSourceForm.configJson = JSON.stringify(source.config ?? {}, null, 2);
}

function cancelEditingSource() {
  editingSourceId.value = null;
  editSourceStatus.value = "";
}

async function toggleSourcePaused(sourceId: string, isPaused: boolean) {
  togglingSourceId.value = sourceId;

  try {
    await props.onToggleSourcePaused(sourceId, isPaused);
  } finally {
    togglingSourceId.value = null;
  }
}

async function deleteSourceItem(sourceId: string) {
  deletingSourceId.value = sourceId;

  try {
    await props.onDeleteSource(sourceId);
  } finally {
    deletingSourceId.value = null;
  }
}

async function saveSource(sourceId: string) {
  savingSourceId.value = sourceId;
  editSourceStatus.value = "";

  try {
    await props.onSaveSource(sourceId, {
      name: editSourceForm.name,
      sourceType: editSourceForm.sourceType,
      adapterKey: editSourceForm.adapterKey,
      configJson: editSourceForm.configJson,
    });
    editingSourceId.value = null;
  } catch (error) {
    editSourceStatus.value = error instanceof Error ? error.message : "更新来源失败。";
  } finally {
    savingSourceId.value = null;
  }
}
</script>
