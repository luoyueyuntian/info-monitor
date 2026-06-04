<template>
  <article class="card">
    <h3>最近记录</h3>
    <div v-if="records.length" class="grid gap-3">
      <article v-for="record in records" :key="record.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <span :class="pillToneClass()">{{ themeTypeLabel(record.infoType) }}</span>
        <strong>{{ record.title }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-[#766f63]">{{ formatDateTimeLabel(record.occurredAt) }}</span>
        </div>
        <dl class="mt-2.5 grid gap-1.5">
          <template v-for="entry in recordDetails(record)" :key="`${record.id}-${entry.label}`">
            <div class="flex flex-wrap gap-1.5">
              <dt class="font-bold text-[#473924]">{{ entry.label }}:</dt>
              <dd class="m-0 text-[#695e4c]">{{ entry.value }}</dd>
            </div>
          </template>
        </dl>
      </article>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">这个来源当前还没有标准化记录。</div>
  </article>
</template>

<script setup lang="ts">
import type { SourceDetail } from "../../../../lib/api";
import { formatDateTimeLabel, pillToneClass, themeTypeLabel } from "../../../../lib/presentation";

defineProps<{
  records: SourceDetail["records"];
  recordDetails: (record: SourceDetail["records"][number]) => Array<{ label: string; value: string }>;
}>();
</script>
