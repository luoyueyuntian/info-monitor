<template>
  <article class="card">
    <h3>原始快照</h3>
    <div v-if="snapshots.length" class="flex flex-col gap-3">
      <div v-for="snapshot in snapshots" :key="snapshot.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>快照 {{ snapshot.id }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-[#766f63]">抓取时间: {{ formatDateTimeLabel(snapshot.fetchedAt) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">关联运行: {{ snapshot.sourceRunId }}</span>
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2" v-if="snapshot.storagePath">
          <span class="text-[0.88rem] text-[#766f63]">存储路径: {{ snapshot.storagePath }}</span>
        </div>
        <div class="mt-3 rounded-xl border border-slate-400/15 bg-slate-50/90 p-3 font-mono text-[0.84rem] whitespace-pre-wrap break-words text-[#6f665a]">
          {{ snapshot.payloadPreview }}
        </div>
      </div>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">这个来源当前还没有原始快照。</div>
  </article>
</template>

<script setup lang="ts">
import type { SourceDetail } from "../../../../lib/api";
import { formatDateTimeLabel } from "../../../../lib/presentation";

defineProps<{
  snapshots: SourceDetail["snapshots"];
}>();
</script>
