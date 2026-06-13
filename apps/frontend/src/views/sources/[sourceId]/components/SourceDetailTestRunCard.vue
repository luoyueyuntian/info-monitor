<template>
  <article class="card">
    <div class="card-topline">
      <h3>测试运行</h3>
      <span v-if="preview" class="text-[0.88rem] text-ink-secondary">Run {{ preview.runId.slice(0, 12) }}…</span>
    </div>

    <!-- Trigger button -->
    <div class="mb-4 flex flex-wrap gap-3">
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-dark px-4 py-2.5 text-ink-on-dark transition-colors hover:bg-[#241d12] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="running"
        @click="handleRunTest"
      >
        {{ running ? "正在触发测试…" : "运行测试" }}
      </button>
      <button
        v-if="preview"
        class="inline-flex items-center justify-center rounded-xl bg-slate-200/60 px-4 py-2.5 text-ink-body transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="loading"
        @click="loadPreview"
      >
        {{ loading ? "刷新中…" : "刷新结果" }}
      </button>
    </div>

    <!-- Status message -->
    <div v-if="statusMessage" class="mb-4 text-sm text-ink-body">{{ statusMessage }}</div>

    <!-- Preview content -->
    <div v-if="preview" class="grid gap-4">
      <!-- Run status -->
      <div class="flex items-center gap-2">
        <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="runStatusClass(preview.status)">
          {{ runStatusLabel(preview.status) }}
        </span>
        <span class="text-xs text-ink-secondary">
          {{ preview.triggerType === 'test' ? '测试运行' : '手动运行' }}
        </span>
        <span v-if="preview.finishedAt" class="text-xs text-ink-secondary">
          完成于 {{ formatDateTimeLabel(preview.finishedAt) }}
        </span>
      </div>

      <!-- Processing indicator for pending/running -->
      <div v-if="preview.status === 'pending' || preview.status === 'running'" class="rounded-xl bg-blue-50 px-3.5 py-3 text-sm text-blue-800">
        <div class="font-semibold mb-1">
          {{ preview.status === 'pending' ? '⏳ 测试正在排队...' : '⏳ 测试正在运行...' }}
        </div>
        <div>请等待几秒后点击"刷新结果"查看。</div>
      </div>

      <!-- Issues (only show for completed/failed) -->
      <div v-if="preview.status !== 'pending' && preview.status !== 'running' && preview.issues.length > 0" class="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
        <div class="font-semibold mb-1">发现以下问题：</div>
        <ul class="m-0 pl-4">
          <li v-for="(issue, i) in preview.issues" :key="i">{{ issue }}</li>
        </ul>
      </div>

      <!-- Fetch summary (only for completed/failed) -->
      <template v-if="preview.status !== 'pending' && preview.status !== 'running'">
      <section class="grid gap-2">
        <h4 class="m-0 text-sm font-semibold">抓取结果</h4>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-[0.88rem] text-ink-body">
          <span>状态: {{ preview.fetchSummary.success ? '成功' : '失败' }}</span>
          <span>快照数: {{ preview.fetchSummary.snapshotCount }}</span>
        </div>
        <details v-if="preview.fetchSummary.payloadPreview" class="text-sm">
          <summary class="cursor-pointer text-ink-link">查看抓取数据预览</summary>
          <pre class="mt-2 max-h-[200px] overflow-auto rounded-xl bg-slate-50 p-3 text-xs">{{ preview.fetchSummary.payloadPreview }}</pre>
        </details>
      </section>

      <!-- Parse summary -->
      <section class="grid gap-2">
        <h4 class="m-0 text-sm font-semibold">解析结果</h4>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-[0.88rem] text-ink-body">
          <span>记录数: {{ preview.parseSummary.recordCount }}</span>
          <span>变更数: {{ preview.parseSummary.changeCount }}</span>
          <span>事件数: {{ preview.parseSummary.eventCount }}</span>
        </div>
      </section>

      <!-- Sample records -->
      <section v-if="preview.sampleRecords.length > 0" class="grid gap-2">
        <h4 class="m-0 text-sm font-semibold">示例记录 (前 {{ preview.sampleRecords.length }} 条)</h4>
        <div class="grid gap-2">
          <div
            v-for="(record, i) in preview.sampleRecords"
            :key="i"
            class="rounded-xl border border-slate-400/15 bg-slate-50/60 px-3.5 py-2.5"
          >
            <div class="font-semibold text-sm">{{ record.title }}</div>
            <div class="text-xs text-ink-secondary mt-0.5">
              {{ record.infoType }} · {{ formatDateTimeLabel(record.occurredAt) }}
            </div>
            <pre class="mt-2 max-h-[120px] overflow-auto text-xs text-ink-body">{{ record.contentPreview }}</pre>
          </div>
        </div>
      </section>

      <!-- No records message -->
      <div v-if="preview.sampleRecords.length === 0 && preview.status === 'completed'" class="text-sm text-ink-body">
        运行完成但没有解析出记录。请检查适配器配置是否正确。
      </div>
      </template>
    </div>

    <!-- Empty state -->
    <div v-if="!preview && !running && !loading" class="text-sm text-ink-body">
      点击"运行测试"按钮来验证这个来源的配置。测试运行会实际执行抓取和解析，但使用测试标记以便区分。
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { triggerTestSourceRun, fetchSourceTestPreview } from "../../../../lib/api";
import type { SourceTestRunPreview } from "../../../../lib/api";
import { formatDateTimeLabel } from "../../../../lib/presentation";

const props = defineProps<{
  sourceId: string;
  onboardingStatus?: string;
}>();

const emit = defineEmits<{
  testCompleted: [result: { success: boolean; runId: string }];
}>();

const running = ref(false);
const loading = ref(false);
const statusMessage = ref("");
const preview = ref<SourceTestRunPreview | null>(null);

async function loadPreview() {
  loading.value = true;
  statusMessage.value = "";
  try {
    preview.value = await fetchSourceTestPreview(props.sourceId);
    if (!preview.value) {
      statusMessage.value = "暂无测试运行记录。";
    }
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : "加载测试预览失败。";
  } finally {
    loading.value = false;
  }
}

async function handleRunTest() {
  running.value = true;
  statusMessage.value = "正在触发测试运行…";
  preview.value = null;

  try {
    const result = await triggerTestSourceRun(props.sourceId);
    statusMessage.value = `测试运行已入队 (Run ID: ${result.runId.slice(0, 12)}…)。请等待几秒后点击"刷新结果"查看。`;

    // Auto-refresh after a short delay
    setTimeout(async () => {
      await loadPreview();
      if (preview.value) {
        emit("testCompleted", {
          success: preview.value.status === "completed" && preview.value.issues.length === 0,
          runId: preview.value.runId,
        });
      }
    }, 2000);
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : "触发测试运行失败。";
  } finally {
    running.value = false;
  }
}

function runStatusClass(status: string): string {
  switch (status) {
    case "completed": return "bg-green-100 text-green-700";
    case "failed": return "bg-red-100 text-red-700";
    case "running": return "bg-blue-100 text-blue-700";
    case "pending": return "bg-amber-100 text-amber-700";
    default: return "bg-slate-200/60 text-slate-600";
  }
}

function runStatusLabel(status: string): string {
  switch (status) {
    case "completed": return "已完成";
    case "failed": return "失败";
    case "running": return "运行中";
    case "pending": return "等待中";
    default: return status;
  }
}

onMounted(async () => {
  await loadPreview();
});
</script>
