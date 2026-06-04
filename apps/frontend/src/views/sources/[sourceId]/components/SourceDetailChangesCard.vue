<template>
  <article class="card">
    <h3>最近变化</h3>
    <div v-if="changes.length" class="flex flex-col gap-3">
      <div v-for="change in changes" :key="change.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <strong>{{ changeTypeLabel(change.changeType) }}</strong>
        <div class="text-[0.88rem] text-[#766f63]">{{ formatSmartDateTimeLabel(change.detectedAt) }}</div>
        <div class="text-[#6f665a]">{{ change.summary }}</div>
        <dl class="mt-2.5 grid gap-1.5" v-if="changeDetails(change).length">
          <template v-for="entry in changeDetails(change)" :key="`${change.id}-${entry.label}`">
            <div class="flex flex-wrap gap-1.5">
              <dt class="font-bold text-[#473924]">{{ entry.label }}:</dt>
              <dd class="m-0 text-[#695e4c]">{{ entry.value }}</dd>
            </div>
          </template>
        </dl>
      </div>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">这个来源当前还没有检测到变化。</div>
  </article>
</template>

<script setup lang="ts">
import type { SourceDetail } from "../../../../lib/api";
import { changeTypeLabel, formatSmartDateTimeLabel } from "../../../../lib/presentation";

defineProps<{
  changes: SourceDetail["changes"];
  changeDetails: (change: SourceDetail["changes"][number]) => Array<{ label: string; value: string }>;
}>();
</script>
