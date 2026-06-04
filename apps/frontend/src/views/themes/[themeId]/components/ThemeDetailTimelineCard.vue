<template>
  <article class="card">
    <h3>时间线</h3>
    <p class="section-description">
      把来源运行、记录变化和事件信号串成一条线，方便追踪“发生了什么，为什么发生”。
    </p>
    <div v-if="timeline.length" class="timeline-list">
      <div
        v-for="entry in timeline"
        :key="`${entry.kind}-${entry.id}`"
        class="timeline-item"
        :class="timelineItemClass(entry)"
      >
        <div class="timeline-marker" :class="timelineItemClass(entry)"></div>
        <div class="theme-topline">
          <span class="pill">{{ formatTimelineKindLabel(entry.kind) }}</span>
          <span
            :class="pillToneClass(String(timelineMeta(entry).emphasis ?? ''))"
            v-if="timelineMeta(entry).emphasis"
          >
            {{ timelineMeta(entry).emphasis }}
          </span>
        </div>
        <strong>{{ entry.title }}</strong>
        <div class="meta-row">
          <span class="meta">{{ formatSmartDateTimeLabel(entry.at) }}</span>
          <span class="meta" v-if="timelineMeta(entry).sourceName">
            来源: {{ timelineMeta(entry).sourceName }}
          </span>
        </div>
        <div class="muted">{{ entry.summary }}</div>
        <dl class="record-kv" v-if="timelineMeta(entry).details.length">
          <template v-for="item in timelineMeta(entry).details" :key="`${entry.id}-${item.label}`">
            <div>
              <dt>{{ item.label }}:</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </template>
        </dl>
      </div>
    </div>
    <div v-else class="empty-state">
      这个主题当前还没有时间线条目。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ThemeDetail } from "../../../../lib/api";
import { formatSmartDateTimeLabel, pillToneClass } from "../../../../lib/presentation";

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
