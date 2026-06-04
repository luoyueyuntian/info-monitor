<template>
  <div
    v-for="section in sections"
    :key="section.id"
    :ref="setSectionRef(section.id)"
  >
    <HomeInboxEventSectionCard
      :highlighted="section.id === focusedSectionId"
      :section="section"
      :event-header-tone-class="eventHeaderToneClass"
      :event-details="eventDetails"
    />
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import type { RouteLocationRaw } from "vue-router";

import type { EventSummary } from "../../../lib/api";
import HomeInboxEventSectionCard from "./HomeInboxEventSectionCard.vue";

defineProps<{
  sections: Array<{
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
  }>;
  focusedSectionId: string;
  setSectionRef: (
    sectionId: string,
  ) => (element: Element | ComponentPublicInstance | null) => void;
  eventHeaderToneClass: (event: EventSummary) => string;
  eventDetails: (event: EventSummary) => Array<{ label: string; value: string }>;
}>();
</script>
