<template>
  <div v-if="explanation" class="flex flex-wrap items-center gap-1.5">
    <span :class="impactBadgeClass">{{ impactLabel }}</span>
    <span v-if="explanation.issue" class="text-[0.78rem] text-ink-secondary">{{ explanation.issue }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { SourceHealthExplanation } from "../lib/api";
import { fetchSourceHealthExplanation } from "../lib/api";

const props = defineProps<{
  sourceId: string;
}>();

const explanation = ref<SourceHealthExplanation | null>(null);

async function loadExplanation() {
  if (!props.sourceId) return;
  try {
    explanation.value = await fetchSourceHealthExplanation(props.sourceId);
  } catch {
    explanation.value = null;
  }
}

const impactLabel = computed(() => {
  if (!explanation.value) return "";
  switch (explanation.value.impactLevel) {
    case "high": return "高影响";
    case "medium": return "中影响";
    case "low": return "低影响";
    default: return "正常";
  }
});

const impactBadgeClass = computed(() => {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[0.72rem] font-semibold";
  if (!explanation.value) return base;
  switch (explanation.value.impactLevel) {
    case "high": return `${base} bg-red-100 text-red-700`;
    case "medium": return `${base} bg-amber-100 text-amber-700`;
    case "low": return `${base} bg-blue-100 text-blue-700`;
    default: return `${base} bg-green-100 text-green-700`;
  }
});

watch(() => props.sourceId, loadExplanation, { immediate: true });
</script>
