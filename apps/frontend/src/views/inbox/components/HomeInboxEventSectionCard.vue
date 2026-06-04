<template>
  <article
    class="card section-card"
    :class="{ 'section-card--highlight': highlighted }"
  >
    <div class="section-header-row inbox-card-header">
      <div class="inbox-card-copy">
        <h3>{{ section.title }}</h3>
        <p>{{ section.description }}</p>
      </div>
      <RouterLink
        class="text-action section-more-button"
        :to="`/inbox/sections/${section.id}`"
      >
        {{ section.recentCount > 0 ? `查看更多 ${section.recentCount}` : "查看更多" }}
        <span aria-hidden="true">›</span>
      </RouterLink>
    </div>

    <div class="breakdown-item section-digest">
      <strong>{{ section.digest.headline }}</strong>
      <div class="muted">{{ section.digest.summary }}</div>
      <div class="list compact-list">
        <div
          v-for="item in section.digest.highlights"
          :key="`${section.id}-${item}`"
          class="compact-list-item"
        >
          {{ item }}
        </div>
      </div>
      <RouterLink
        v-if="section.digest.primaryTarget"
        class="text-action section-digest-action"
        :to="section.digest.primaryTarget"
      >
        {{ section.digest.primaryActionLabel }}
        <span aria-hidden="true">›</span>
      </RouterLink>
    </div>

    <div v-if="section.events.length" class="list">
      <RouterLink
        v-for="event in section.visibleEvents"
        :key="event.id"
        class="list-item event-list-item"
        :to="`/events/${event.id}`"
      >
        <div class="event-card-head" :class="eventHeaderToneClass(event)">
          <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
          <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
          <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
        </div>
        <div class="event-card-body">
          <strong>{{ event.title }}</strong>
          <div class="meta">{{ event.themeName }} · {{ formatSmartDateTimeLabel(event.occurredAt) }}</div>
          <div class="muted">{{ event.summary }}</div>
          <div class="record-kv" v-if="eventDetails(event).length">
            <template v-for="entry in eventDetails(event)" :key="`${event.id}-${entry.label}`">
              <div>
                <dt>{{ entry.label }}:</dt>
                <dd>{{ entry.value }}</dd>
              </div>
            </template>
          </div>
        </div>
      </RouterLink>
    </div>
    <div v-else class="empty-state">
      这一分区当前没有新的事件。
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import type { EventSummary } from "../../../lib/api";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../lib/presentation";

defineProps<{
  highlighted: boolean;
  section: {
    id: string;
    title: string;
    description: string;
    events: EventSummary[];
    visibleEvents: EventSummary[];
    recentCount: number;
    digest: {
      headline: string;
      summary: string;
      highlights: string[];
      primaryTarget: RouteLocationRaw | null;
      primaryActionLabel: string;
    };
  };
  eventHeaderToneClass: (event: EventSummary) => string;
  eventDetails: (event: EventSummary) => Array<{ label: string; value: string }>;
}>();
</script>
