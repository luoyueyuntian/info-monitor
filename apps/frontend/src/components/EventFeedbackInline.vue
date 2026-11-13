<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-[0.82rem] text-ink-secondary">反馈:</span>
    <button
      v-for="option in feedbackOptions"
      :key="option.value"
      class="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold transition-colors"
      :class="currentFeedback === option.value
        ? option.activeClass
        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
      :disabled="saving"
      @click.stop="handleFeedback(option.value)"
    >
      {{ option.label }}
    </button>
    <button
      v-if="currentFeedback"
      class="text-[0.78rem] text-ink-secondary hover:text-ink-heading"
      :disabled="saving"
      @click.stop="handleClear"
    >
      清除
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { EventFeedback } from "../lib/api";
import { fetchEventFeedback, upsertEventFeedback, deleteEventFeedback } from "../lib/api";

const props = defineProps<{
  eventId: string;
  initialFeedback?: EventFeedback | null;
}>();

const currentFeedback = ref<EventFeedback | null>(null);
const saving = ref(false);

const feedbackOptions = [
  { value: "useful" as EventFeedback, label: "有用", activeClass: "bg-green-100 text-green-800" },
  { value: "noise" as EventFeedback, label: "噪音", activeClass: "bg-red-100 text-red-800" },
  { value: "watch" as EventFeedback, label: "待观察", activeClass: "bg-amber-100 text-amber-800" },
];

async function loadFeedback() {
  if (!props.eventId) return;
  if (props.initialFeedback !== undefined) {
    currentFeedback.value = props.initialFeedback;
    return;
  }
  try {
    const result = await fetchEventFeedback(props.eventId);
    currentFeedback.value = result?.feedback ?? null;
  } catch {
    currentFeedback.value = null;
  }
}

async function handleFeedback(feedback: EventFeedback) {
  saving.value = true;
  try {
    await upsertEventFeedback(props.eventId, feedback);
    currentFeedback.value = feedback;
  } catch {
    // silently fail
  } finally {
    saving.value = false;
  }
}

async function handleClear() {
  saving.value = true;
  try {
    await deleteEventFeedback(props.eventId);
    currentFeedback.value = null;
  } catch {
    // silently fail
  } finally {
    saving.value = false;
  }
}

watch(() => [props.eventId, props.initialFeedback], loadFeedback, { immediate: true });
</script>
