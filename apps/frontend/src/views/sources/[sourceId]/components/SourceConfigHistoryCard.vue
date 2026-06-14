<template>
  <article class="card">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3>配置版本历史</h3>
      <button
        class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2 text-[0.82rem] text-ink transition-colors hover:bg-slate-50"
        :disabled="loading"
        @click="loadHistory"
      >
        {{ loading ? "加载中..." : "刷新" }}
      </button>
    </div>

    <div v-if="loading" class="mt-3 text-[0.88rem] text-ink-secondary">加载中...</div>

    <div v-else-if="versions.length === 0" class="mt-3 rounded-xl border border-dashed border-slate-400/30 p-6 text-center text-[0.88rem] text-ink-secondary">
      暂无配置变更历史
    </div>

    <div v-else class="mt-3 grid gap-2">
      <div
        v-for="version in versions"
        :key="version.id"
        class="rounded-xl border border-slate-400/15 bg-white/70 px-3.5 py-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[0.78rem] font-semibold text-slate-600">
              v{{ version.version }}
            </span>
            <span class="text-[0.82rem] text-ink-secondary">{{ formatTime(version.createdAt) }}</span>
            <span v-if="diffWithCurrent(version).length > 0" class="text-[0.78rem] text-amber-600">
              {{ diffSummary(computeConfigDiff(version.config, currentConfig)) }}
            </span>
            <span v-else class="text-[0.78rem] text-emerald-600">与当前一致</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="inline-flex items-center justify-center rounded-lg border border-border bg-white px-2.5 py-1 text-[0.78rem] text-ink transition-colors hover:bg-slate-50"
              @click="toggleDiff(version.version)"
            >
              {{ expandedDiff === version.version ? "收起对比" : "查看对比" }}
            </button>
            <button
              class="inline-flex items-center justify-center rounded-lg bg-btn-primary px-3 py-1.5 text-[0.78rem] font-semibold text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="rollingBack !== false"
              @click="handleRollback(version.version)"
            >
              {{ rollingBack === version.version ? "回滚中..." : "回滚" }}
            </button>
          </div>
        </div>

        <!-- Expanded diff view -->
        <div v-if="expandedDiff === version.version" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div class="mb-2 text-[0.82rem] font-semibold text-slate-700">
            与当前配置对比:
          </div>
          <div v-if="diffWithCurrent(version).length === 0" class="text-[0.82rem] text-emerald-600">
            配置完全一致
          </div>
          <div v-else class="grid gap-1">
            <div
              v-for="entry in diffWithCurrent(version)"
              :key="entry.key"
              class="flex items-start gap-2 rounded px-2 py-1 text-[0.78rem]"
              :class="diffEntryClass(entry.type)"
            >
              <span class="min-w-[5rem] font-mono font-semibold">{{ entry.key }}</span>
              <span v-if="entry.type === 'added'" class="text-emerald-700">
                + {{ formatValue(entry.newValue) }}
              </span>
              <span v-else-if="entry.type === 'removed'" class="text-red-700">
                − {{ formatValue(entry.oldValue) }}
              </span>
              <span v-else-if="entry.type === 'changed'" class="text-amber-700">
                {{ formatValue(entry.oldValue) }} → {{ formatValue(entry.newValue) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Raw config (collapsed by default) -->
        <details class="mt-2">
          <summary class="cursor-pointer text-[0.78rem] text-slate-500 hover:text-slate-700">原始 JSON</summary>
          <pre class="mt-1 max-h-32 overflow-auto rounded-lg bg-slate-50 p-2 text-[0.78rem] text-[#4b5563]">{{ JSON.stringify(version.config, null, 2) }}</pre>
        </details>
      </div>
    </div>

    <div v-if="rollbackStatus" class="mt-3 rounded-xl px-3.5 py-2.5 text-[0.88rem]" :class="rollbackStatus.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'">
      {{ rollbackStatus.message }}
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { fetchSourceConfigHistory, rollbackSourceConfig, type SourceConfigVersion } from "../../../../lib/api";
import { computeConfigDiff, diffSummary, type ConfigDiffEntry } from "./source-config-diff";

const props = defineProps<{
  sourceId: string;
  currentConfig?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  configRolledBack: [];
}>();

const versions = ref<SourceConfigVersion[]>([]);
const loading = ref(false);
const rollingBack = ref<number | false>(false);
const rollbackStatus = ref<{ success: boolean; message: string } | null>(null);
const expandedDiff = ref<number | null>(null);

const currentConfig = computed(() => props.currentConfig ?? {});

function diffWithCurrent(version: SourceConfigVersion): ConfigDiffEntry[] {
  return computeConfigDiff(version.config, currentConfig.value).filter((e) => e.type !== "unchanged");
}

function toggleDiff(version: number) {
  expandedDiff.value = expandedDiff.value === version ? null : version;
}

function diffEntryClass(type: ConfigDiffEntry["type"]): string {
  switch (type) {
    case "added": return "bg-emerald-50";
    case "removed": return "bg-red-50";
    case "changed": return "bg-amber-50";
    default: return "";
  }
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

async function loadHistory() {
  loading.value = true;
  try {
    versions.value = await fetchSourceConfigHistory(props.sourceId);
  } finally {
    loading.value = false;
  }
}

async function handleRollback(version: number) {
  rollingBack.value = version;
  rollbackStatus.value = null;
  try {
    await rollbackSourceConfig(props.sourceId, version);
    rollbackStatus.value = { success: true, message: `已回滚到 v${version}` };
    emit("configRolledBack");
    await loadHistory();
    setTimeout(() => { rollbackStatus.value = null; }, 3000);
  } catch (e) {
    rollbackStatus.value = { success: false, message: `回滚失败: ${e instanceof Error ? e.message : "未知错误"}` };
  } finally {
    rollingBack.value = false;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

onMounted(() => loadHistory());
</script>
