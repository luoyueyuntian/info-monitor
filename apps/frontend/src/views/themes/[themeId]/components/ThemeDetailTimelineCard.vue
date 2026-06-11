<template>
  <article class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <h3 class="mb-2 text-[1.05rem] font-semibold text-[#2f2618]">主题时间线</h3>
    <p class="mb-4 text-[0.88rem] text-[#6f665a]">
      把来源运行、记录变化、事件信号和通知串成一条线，方便追踪"发生了什么，为什么发生"。
    </p>

    <!-- Legend -->
    <div class="mb-4 flex flex-wrap gap-3 text-[0.78rem]">
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-[#5c7488]"></span>
        <span class="text-[#6f665a]">来源运行</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-[#7d6540]"></span>
        <span class="text-[#6f665a]">记录变化</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-[#bb7a17]"></span>
        <span class="text-[#6f665a]">事件信号</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
        <span class="text-[#6f665a]">通知</span>
      </div>
    </div>

    <div v-if="timeline.length" class="relative">
      <!-- Timeline line -->
      <div class="absolute left-[10px] top-0 bottom-0 w-0.5 bg-slate-200"></div>

      <div class="flex flex-col gap-4">
        <div
          v-for="entry in timeline"
          :key="`${entry.kind}-${entry.id}`"
          class="relative flex gap-4 pl-8"
        >
          <!-- Timeline dot -->
          <div
            class="absolute left-[6px] top-4 h-3 w-3 rounded-full border-2 border-white"
            :class="timelineMarkerClass(entry.kind)"
          ></div>

          <!-- Card -->
          <div
            class="flex-1 rounded-xl border border-slate-400/15 bg-slate-50/80 p-4 transition-colors hover:bg-slate-50"
            :class="timelineItemClass(entry)"
          >
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold"
                :class="kindPillClass(entry.kind)"
              >
                {{ formatTimelineKindLabel(entry.kind) }}
              </span>
              <span
                v-if="timelineMeta(entry).emphasis"
                class="inline-flex items-center rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold"
                :class="pillToneClass(String(timelineMeta(entry).emphasis ?? ''))"
              >
                {{ timelineMeta(entry).emphasis }}
              </span>
              <span class="ml-auto text-[0.82rem] text-[#8a8078]">
                {{ formatSmartDateTimeLabel(entry.at) }}
              </span>
            </div>

            <strong class="block text-[0.95rem] font-semibold text-[#2f2618]">{{ entry.title }}</strong>

            <div class="mt-1 flex flex-wrap items-center gap-3 text-[0.82rem] text-[#8a8078]">
              <span v-if="timelineMeta(entry).sourceName">
                来源: {{ timelineMeta(entry).sourceName }}
              </span>
            </div>

            <p class="mt-2 text-[0.88rem] leading-6 text-[#6f665a]">{{ entry.summary }}</p>

            <dl v-if="timelineMeta(entry).details.length" class="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <div v-for="item in timelineMeta(entry).details" :key="`${entry.id}-${item.label}`" class="flex flex-wrap gap-1.5">
                <dt class="font-semibold text-[#473924]">{{ item.label }}:</dt>
                <dd class="m-0 text-[#695e4c]">{{ item.value }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="rounded-2xl border border-slate-400/15 bg-slate-50/80 p-6 text-center text-[#6f665a]">
      这个主题当前还没有时间线条目。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeDetail } from "../../../../lib/api";
import { formatSmartDateTimeLabel, pillToneClass } from "../../../../lib/presentation";

function timelineMarkerClass(kind: string) {
  if (kind === "event") {
    return "bg-[#bb7a17] shadow-[0_0_0_4px_rgba(187,122,23,0.14)]";
  }

  if (kind === "change") {
    return "bg-[#7d6540] shadow-[0_0_0_4px_rgba(125,101,64,0.12)]";
  }

  if (kind === "notification") {
    return "bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]";
  }

  return "bg-[#5c7488] shadow-[0_0_0_4px_rgba(92,116,136,0.12)]";
}

function kindPillClass(kind: string): string {
  const base = "inline-flex items-center rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold";

  switch (kind) {
    case "event":
      return `${base} bg-amber-50 text-amber-700`;
    case "change":
      return `${base} bg-orange-50 text-orange-700`;
    case "notification":
      return `${base} bg-blue-50 text-blue-700`;
    case "run":
      return `${base} bg-slate-100 text-slate-600`;
    default:
      return `${base} bg-slate-100 text-slate-500`;
  }
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
