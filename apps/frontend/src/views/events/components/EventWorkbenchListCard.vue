<template>
  <article class="card">
    <div class="card-topline">
      <h3>事件列表</h3>
      <span class="text-[0.88rem] text-ink-secondary">共 {{ events.length }} 条事件</span>
    </div>

    <div v-if="events.length" class="flex flex-col gap-3">
      <div
        v-for="event in events"
        :key="event.id"
        class="rounded-2xl border px-4 py-3.5"
        :class="isIncrementalEvent(event) ? 'border-[rgba(120,120,120,0.28)] bg-white/95 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]' : 'border-slate-400/15 bg-slate-50/90'"
      >
        <label class="event-select-row flex items-center gap-2.5 font-semibold">
          <input
            :checked="selectedEventIds.includes(event.id)"
            type="checkbox"
            @change="toggleEventSelection(event.id)"
          />
          选中事件
        </label>
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(eventImpactTone(event))">{{ impactToneLabel(eventImpactTone(event)) }}</span>
          <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
          <span :class="pillToneClass()" v-if="event.infoType">{{ themeTypeLabel(event.infoType) }}</span>
          <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
          <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
          <span :class="pillToneClass('neutral')" v-if="isIncrementalEvent(event)">本次新增</span>
        </div>
        <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link" :to="`/events/${event.id}`">
          {{ event.title }}
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-ink-secondary">主题: {{ event.themeName }}</span>
          <span class="text-[0.88rem] text-ink-secondary">时间: {{ formatSmartDateTimeLabel(event.occurredAt) }}</span>
          <span class="text-[0.88rem] text-ink-secondary" v-if="event.latestStatusChangedAt">
            状态更新于: {{ formatSmartDateTimeLabel(event.latestStatusChangedAt) }}
          </span>
        </div>
        <div class="text-ink-body">{{ event.summary }}</div>
        <div class="mt-3 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: `/themes/${event.themeId}`, query: { section: eventImpactTone(event) === 'negative' ? 'analysis' : event.infoType === 'price' ? 'trend' : 'timeline' } }"
          >
            {{ eventImpactTone(event) === "negative" ? "查看主题分析" : event.infoType === "price" ? "查看主题趋势" : "查看主题时间线" }}
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: '/sources/status', query: { themeId: event.themeId } }"
          >
            查看来源状态
          </RouterLink>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && pendingStatus === 'open'"
            @click="handleUpdateStatus(event.id, 'open')"
          >
            {{ savingEventId === event.id && pendingStatus === 'open' ? "正在更新..." : "待处理" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && pendingStatus === 'tracking'"
            @click="handleUpdateStatus(event.id, 'tracking')"
          >
            {{ savingEventId === event.id && pendingStatus === 'tracking' ? "正在更新..." : "关注中" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && pendingStatus === 'ignored'"
            @click="handleUpdateStatus(event.id, 'ignored')"
          >
            {{ savingEventId === event.id && pendingStatus === 'ignored' ? "正在更新..." : "已忽略" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && (pendingStatus === 'read' || pendingStatus === 'unread')"
            @click="handleUpdateMeta(event.id, { isRead: !(event.isRead ?? false) }, (event.isRead ?? false) ? 'unread' : 'read')"
          >
            {{
              savingEventId === event.id && (pendingStatus === 'read' || pendingStatus === 'unread')
                ? "正在更新..."
                : (event.isRead ?? false)
                  ? "标记未读"
                  : "标记已读"
            }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingEventId === event.id && pendingStatus === 'bookmark'"
            @click="handleUpdateMeta(event.id, { isBookmarked: !(event.isBookmarked ?? false) }, 'bookmark')"
          >
            {{
              savingEventId === event.id && pendingStatus === 'bookmark'
                ? "正在更新..."
                : (event.isBookmarked ?? false)
                  ? "取消收藏"
                  : "加入收藏"
            }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="rounded-2xl bg-slate-100/90 p-4 text-ink-body">
      当前筛选条件下没有匹配的事件。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { EventSummary } from "../../../lib/api";
import { eventImpactTone, impactToneLabel } from "../../../lib/impact";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
  themeTypeLabel,
} from "../../../lib/presentation";

defineProps<{
  events: EventSummary[];
  selectedEventIds: string[];
  savingEventId: string;
  pendingStatus: string;
  isIncrementalEvent: (event: EventSummary) => boolean;
  toggleEventSelection: (eventId: string) => void;
  handleUpdateStatus: (eventId: string, status: string) => void;
  handleUpdateMeta: (
    eventId: string,
    input: {
      isRead?: boolean;
      isBookmarked?: boolean;
    },
    pendingKey: string,
  ) => void;
}>();
</script>
