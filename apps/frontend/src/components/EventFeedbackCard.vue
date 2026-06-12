<template>
  <article class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <strong class="text-[0.92rem] text-ink-heading">事件反馈</strong>
        <div class="mt-1 text-[0.84rem] text-ink-secondary">标记这个事件是否有用，帮助优化后续推荐</div>
      </div>
      <div v-if="currentFeedback" class="flex items-center gap-2">
        <span :class="feedbackBadgeClass(currentFeedback.feedback)">
          {{ feedbackLabel(currentFeedback.feedback) }}
        </span>
        <button
          class="text-[0.82rem] text-ink-secondary hover:text-ink-heading"
          @click="handleClear"
          :disabled="saving"
        >
          清除
        </button>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="option in feedbackOptions"
        :key="option.value"
        class="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-[0.88rem] font-semibold transition-colors disabled:opacity-50"
        :class="currentFeedback?.feedback === option.value
          ? 'border-[#8a5b1f] bg-[#8a5b1f] text-white'
          : 'border-slate-400/15 bg-white/70 text-slate-700 hover:bg-slate-50'"
        :disabled="saving"
        @click="handleFeedback(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="showNoteInput" class="mt-3">
      <textarea
        v-model="noteContent"
        class="w-full rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5 text-[0.88rem] leading-5 text-[#1f2937] focus:border-[#8a5b1f] focus:outline-none focus:ring-1 focus:ring-[#8a5b1f]"
        rows="2"
        placeholder="添加备注（可选）..."
        :disabled="saving"
      />
      <div class="mt-2 flex items-center gap-2">
        <button
          class="inline-flex items-center justify-center rounded-xl bg-[#8a5b1f] px-3 py-2 text-[0.84rem] font-semibold text-white transition-colors hover:bg-[#6a4b14] disabled:opacity-50"
          :disabled="saving"
          @click="handleSaveNote"
        >
          {{ saving ? "保存中..." : "保存备注" }}
        </button>
        <button
          class="inline-flex items-center justify-center rounded-xl border border-slate-400/15 bg-white px-3 py-2 text-[0.84rem] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          :disabled="saving"
          @click="showNoteInput = false"
        >
          取消
        </button>
      </div>
    </div>

    <div v-else-if="currentFeedback?.note" class="mt-3 rounded-xl border border-slate-400/15 bg-white/70 px-3 py-2.5">
      <div class="text-[0.84rem] text-[#4b5563]">{{ currentFeedback.note }}</div>
      <button
        class="mt-1 text-[0.82rem] text-ink-secondary hover:text-ink-heading"
        @click="handleEditNote"
      >
        编辑备注
      </button>
    </div>

    <div v-else-if="currentFeedback" class="mt-2">
      <button
        class="text-[0.84rem] text-ink-secondary hover:text-ink-heading"
        @click="handleEditNote"
      >
        添加备注
      </button>
    </div>

    <div v-if="statusMessage" class="mt-2 text-[0.84rem]" :class="statusMessageClass">
      {{ statusMessage }}
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { EventFeedback, EventFeedbackRecord } from "../lib/api";
import { fetchEventFeedback, upsertEventFeedback, deleteEventFeedback } from "../lib/api";

const props = defineProps<{
  eventId: string;
}>();

const emit = defineEmits<{
  feedbackChanged: [feedback: EventFeedback | null];
}>();

const currentFeedback = ref<EventFeedbackRecord | null>(null);
const saving = ref(false);
const showNoteInput = ref(false);
const noteContent = ref("");
const statusMessage = ref("");
const statusMessageClass = ref("text-ink-secondary");

const feedbackOptions: Array<{ value: EventFeedback; label: string }> = [
  { value: "useful", label: "有用" },
  { value: "noise", label: "噪音" },
  { value: "watch", label: "继续观察" },
];

async function loadFeedback() {
  if (!props.eventId) {
    return;
  }

  try {
    currentFeedback.value = await fetchEventFeedback(props.eventId);
  } catch {
    currentFeedback.value = null;
  }
}

async function handleFeedback(feedback: EventFeedback) {
  saving.value = true;
  statusMessage.value = "";

  try {
    const result = await upsertEventFeedback(props.eventId, feedback);
    currentFeedback.value = result;
    emit("feedbackChanged", feedback);
    statusMessage.value = "反馈已保存";
    statusMessageClass.value = "text-green-600";

    // Clear success message after 3 seconds
    setTimeout(() => {
      if (statusMessage.value === "反馈已保存") {
        statusMessage.value = "";
      }
    }, 3000);
  } catch {
    statusMessage.value = "保存失败，请重试";
    statusMessageClass.value = "text-red-600";
  } finally {
    saving.value = false;
  }
}

async function handleClear() {
  saving.value = true;
  statusMessage.value = "";

  try {
    await deleteEventFeedback(props.eventId);
    currentFeedback.value = null;
    emit("feedbackChanged", null);
    statusMessage.value = "反馈已清除";
    statusMessageClass.value = "text-green-600";

    // Clear success message after 3 seconds
    setTimeout(() => {
      if (statusMessage.value === "反馈已清除") {
        statusMessage.value = "";
      }
    }, 3000);
  } catch {
    statusMessage.value = "清除失败，请重试";
    statusMessageClass.value = "text-red-600";
  } finally {
    saving.value = false;
  }
}

function handleEditNote() {
  noteContent.value = currentFeedback.value?.note ?? "";
  showNoteInput.value = true;
}

async function handleSaveNote() {
  if (!currentFeedback.value) {
    return;
  }

  saving.value = true;
  statusMessage.value = "";

  try {
    const result = await upsertEventFeedback(
      props.eventId,
      currentFeedback.value.feedback,
      noteContent.value || undefined,
    );
    currentFeedback.value = result;
    showNoteInput.value = false;
    statusMessage.value = "备注已保存";
    statusMessageClass.value = "text-green-600";

    // Clear success message after 3 seconds
    setTimeout(() => {
      if (statusMessage.value === "备注已保存") {
        statusMessage.value = "";
      }
    }, 3000);
  } catch {
    statusMessage.value = "保存失败，请重试";
    statusMessageClass.value = "text-red-600";
  } finally {
    saving.value = false;
  }
}

function feedbackBadgeClass(feedback: EventFeedback): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.8rem] font-semibold";

  switch (feedback) {
    case "useful":
      return `${base} bg-green-100 text-green-800`;
    case "noise":
      return `${base} bg-red-100 text-red-800`;
    case "watch":
      return `${base} bg-amber-100 text-amber-800`;
    default:
      return `${base} bg-slate-100 text-slate-500`;
  }
}

function feedbackLabel(feedback: EventFeedback): string {
  switch (feedback) {
    case "useful":
      return "有用";
    case "noise":
      return "噪音";
    case "watch":
      return "继续观察";
    default:
      return "未知";
  }
}

// Load feedback on mount
watch(() => props.eventId, loadFeedback, { immediate: true });
</script>
