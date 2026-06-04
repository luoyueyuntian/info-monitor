<template>
  <article class="card">
    <h3>来源</h3>
    <div class="list">
      <div v-for="source in sources" :key="source.id" class="list-item">
        <div class="theme-topline">
          <span :class="pillToneClass(source.status)">{{ sourceStatusLabel(source.status) }}</span>
          <span class="pill" v-if="source.isPaused">已暂停</span>
          <span :class="pillToneClass(source.latestRunStatus)" v-if="source.latestRunStatus">
            {{ runStatusLabel(source.latestRunStatus) }}
          </span>
        </div>
        <RouterLink class="text-action" :to="`/sources/${source.id}`">
          {{ source.name }}
          <span aria-hidden="true">›</span>
        </RouterLink>
        <div class="meta-row">
          <span class="meta">暂停: {{ source.isPaused ? "是" : "否" }}</span>
          <span class="meta">来源类型: {{ formatMaybeLabel(source.sourceType) }}</span>
          <span class="meta">Adapter: {{ formatMaybeLabel(source.adapterKey) }}</span>
          <span class="meta">最近运行: {{ formatDateTimeLabel(source.latestRunAt) }}</span>
          <span class="meta">最近成功: {{ formatDateTimeLabel(source.latestSuccessAt) }}</span>
          <span class="meta">最近失败: {{ formatDateTimeLabel(source.latestFailureAt) }}</span>
        </div>
        <div class="actions inline">
          <button
            class="button secondary"
            type="button"
            @click="toggleEditSource(source)"
          >
            {{ editingSourceId === source.id ? "收起编辑" : "编辑来源" }}
          </button>
          <button
            class="button secondary"
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
            class="button secondary"
            type="button"
            :disabled="deletingSourceId === source.id"
            @click="deleteSourceItem(source.id)"
          >
            {{ deletingSourceId === source.id ? "正在删除..." : "删除来源" }}
          </button>
        </div>
        <form v-if="editingSourceId === source.id" class="form source-inline-form" @submit.prevent="saveSource(source.id)">
          <div class="grid two">
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
          <div class="actions">
            <button class="button" type="submit" :disabled="savingSourceId === source.id">
              {{ savingSourceId === source.id ? "正在保存..." : "保存修改" }}
            </button>
            <button class="button secondary" type="button" @click="cancelEditingSource">取消</button>
          </div>
          <div v-if="editSourceStatus" class="muted">{{ editSourceStatus }}</div>
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
