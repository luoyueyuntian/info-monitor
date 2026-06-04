<template>
  <article class="card">
    <h3>时间线</h3>
    <p class="mb-3.5 text-[#6e665a]">
      把来源运行、记录变化和事件信号串成一条线，方便追踪“发生了什么，为什么发生”。
    </p>
    <div v-if="timeline.length" class="grid gap-3.5">
      <div
        v-for="entry in timeline"
        :key="`${entry.kind}-${entry.id}`"
        class="relative grid gap-2 rounded-2xl border px-4 py-4 pl-[22px]"
        :class="timelineItemClass(entry)"
      >
        <div class="absolute left-[10px] top-[18px] h-2 w-2 rounded-full" :class="timelineMarkerClass(entry.kind)"></div>
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass()">{{ formatTimelineKindLabel(entry.kind) }}</span>
          <span
            :class="pillToneClass(String(timelineMeta(entry).emphasis ?? ''))"
            v-if="timelineMeta(entry).emphasis"
          >
            {{ timelineMeta(entry).emphasis }}
          </span>
        </div>
        <strong>{{ entry.title }}</strong>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-[#766f63]">{{ formatSmartDateTimeLabel(entry.at) }}</span>
          <span class="text-[0.88rem] text-[#766f63]" v-if="timelineMeta(entry).sourceName">
            来源: {{ timelineMeta(entry).sourceName }}
          </span>
        </div>
        <div class="text-[#6f665a]">{{ entry.summary }}</div>
        <dl class="mt-2.5 grid gap-1.5" v-if="timelineMeta(entry).details.length">
          <template v-for="item in timelineMeta(entry).details" :key="`${entry.id}-${item.label}`">
            <div class="flex flex-wrap gap-1.5">
              <dt class="font-bold text-[#473924]">{{ item.label }}:</dt>
              <dd class="m-0 text-[#695e4c]">{{ item.value }}</dd>
            </div>
          </template>
        </dl>
      </div>
    </div>
    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-[#6f665a]">
      这个主题当前还没有时间线条目。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeDetail } from "../../../../lib/api";
import { formatSmartDateTimeLabel, pillToneClass } from "../../../../lib/presentation";

function timelineMarkerClass(kind: string) {
  if (kind === "event") {
    return "bg-[#bb7a17] shadow-[0_0_0_5px_rgba(187,122,23,0.14)]";
  }

  if (kind === "change") {
    return "bg-[#7d6540] shadow-[0_0_0_5px_rgba(125,101,64,0.12)]";
  }

  return "bg-[#5c7488] shadow-[0_0_0_5px_rgba(92,116,136,0.12)]";
}

defineProps<{
  timeline: ThemeDetail["timeline"];
  formatTimelineKindLabel: (kind: string) => string;
  timelineItemClass: (entry: ThemeDetail["timeline"][number]) => string;
  timelineMeta: (
    entry: ThemeDetail["timeline"][number],
  ) => {
    emphasis: string | null;
    sourceName: string | null;
    details: Array<{ label: string; value: string }>;
  };
}>();
</script>
