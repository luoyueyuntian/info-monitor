<template>
  <article class="card">
    <div class="section-header-row">
      <div>
        <h3>{{ title }}</h3>
        <p class="section-description">{{ description }}</p>
      </div>
    </div>
    <div v-if="events.length" class="list">
      <RouterLink
        v-for="event in events"
        :key="event.id"
        class="list-item event-list-item"
        :to="`/events/${event.id}`"
      >
        <div class="event-card-head" :class="eventHeaderToneClass(event)">
          <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
          <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
          <template v-if="showMetaPills">
            <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
            <span :class="pillToneClass(event.isBookmarked ? '30d_low' : 'neutral')">{{ eventBookmarkLabel(event.isBookmarked) }}</span>
          </template>
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
    <div v-else class="empty-state">{{ emptyText }}</div>
  </article>
</template>

<script setup lang="ts">
import type { EventSummary } from "../../../../../lib/api";
import {
  eventBookmarkLabel,
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
} from "../../../../../lib/presentation";

defineProps<{
  title: string;
  description: string;
  emptyText: string;
  events: EventSummary[];
  showMetaPills?: boolean;
  eventHeaderToneClass: (event: EventSummary) => string;
  eventDetails: (event: EventSummary) => Array<{ label: string; value: string }>;
}>();
</script>
