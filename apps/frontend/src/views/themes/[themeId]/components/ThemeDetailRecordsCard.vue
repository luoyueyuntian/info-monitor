<template>
  <article class="card">
    <h3>最近记录</h3>
    <div v-if="records.length" class="grid gap-3">
      <article v-for="record in records" :key="record.id" class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
        <span :class="pillToneClass()">{{ themeTypeLabel(record.infoType) }}</span>
        <strong>{{ record.title }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <RouterLink
            v-if="record.sourceId && record.sourceName"
            class="text-[0.88rem] font-semibold text-[#6b4f1f] transition-colors hover:text-[#53380b]"
            :to="`/sources/${record.sourceId}`"
          >
            {{ record.sourceName }}
          </RouterLink>
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
        <div v-if="recordLink(record)" class="mt-2.5 text-[0.92rem] text-[#604510]">
          <a :href="recordLink(record)!" target="_blank" rel="noreferrer">打开原始来源</a>
        </div>
      </article>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">
      这个主题当前还没有记录。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeRecord } from "../../../../lib/api";
import { formatDateTimeLabel, pillToneClass, themeTypeLabel } from "../../../../lib/presentation";

defineProps<{
  records: ThemeRecord[];
  recordDetails: (record: ThemeRecord) => Array<{ label: string; value: string }>;
  recordLink: (record: ThemeRecord) => string | null;
}>();
</script>
