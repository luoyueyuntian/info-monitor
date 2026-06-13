<template>
  <article class="card">
    <h3>原始快照</h3>
    <div v-if="snapshots.length" class="flex flex-col gap-3">
      <div v-for="snapshot in snapshots" :key="snapshot.id" class="rounded-2xl border px-4 py-3.5" :class="snapshot.triggerType === 'test' ? 'border-purple-200 bg-purple-50/50' : 'border-slate-400/15 bg-slate-50/90'">
        <div class="flex items-center gap-2">
          <strong>快照 {{ snapshot.id }}</strong>
          <span v-if="snapshot.triggerType === 'test'" class="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700">测试</span>
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-ink-secondary">抓取时间: {{ formatDateTimeLabel(snapshot.fetchedAt) }}</span>
          <span class="text-[0.88rem] text-ink-secondary">关联运行: {{ snapshot.sourceRunId }}</span>
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2" v-if="snapshot.storagePath">
          <span class="text-[0.88rem] text-ink-secondary">存储路径: {{ snapshot.storagePath }}</span>
        </div>
        <div class="mt-3 rounded-xl border border-slate-400/15 bg-slate-50/90 p-3 font-mono text-[0.84rem] whitespace-pre-wrap break-words text-ink-body">
          {{ snapshot.payloadPreview }}
        </div>
      </div>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-ink-body">这个来源当前还没有原始快照。</div>
  </article>
</template>

<script setup lang="ts">
import type { SourceDetail } from "../../../../lib/api";
import { formatDateTimeLabel } from "../../../../lib/presentation";

defineProps<{
  snapshots: SourceDetail["snapshots"];
}>();
</script>
