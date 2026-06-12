<template>
  <article class="card">
    <div class="card-topline">
      <div>
        <h3>审核笔记</h3>
        <p class="m-0 mt-2 text-ink-body">记录你对这个主题的判断、跟进计划或观察结论。</p>
      </div>
    </div>

    <div class="mt-4">
      <div v-if="isEditing" class="grid gap-3">
        <textarea
          v-model="editContent"
          class="w-full rounded-xl border border-slate-400/15 bg-white/70 px-4 py-3 text-[0.95rem] leading-6 text-[#1f2937] focus:border-[#8a5b1f] focus:outline-none focus:ring-1 focus:ring-[#8a5b1f]"
          rows="6"
          placeholder="输入审核笔记..."
          :disabled="saving"
        />
        <div class="flex flex-wrap items-center gap-3">
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#8a5b1f] px-4 py-2.5 text-[0.92rem] font-semibold text-white transition-colors hover:bg-[#6a4b14] disabled:opacity-50"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? "保存中..." : "保存" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl border border-slate-400/15 bg-white px-4 py-2.5 text-[0.92rem] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            :disabled="saving"
            @click="handleCancel"
          >
            取消
          </button>
          <span v-if="statusMessage" class="text-[0.88rem]" :class="statusMessageClass">
            {{ statusMessage }}
          </span>
        </div>
      </div>

      <div v-else class="grid gap-3">
        <div
          v-if="note.content"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-4 py-3.5"
        >
          <div class="whitespace-pre-wrap text-[0.95rem] leading-6 text-[#1f2937]">{{ note.content }}</div>
          <div v-if="note.updatedAt" class="mt-3 text-[0.84rem] text-ink-secondary">
            最后更新: {{ formatDateTime(note.updatedAt) }}
          </div>
        </div>

        <div
          v-else
          class="rounded-xl border border-dashed border-slate-400/30 bg-slate-50/50 px-4 py-8 text-center"
        >
          <div class="text-[0.92rem] text-ink-secondary">还没有审核笔记</div>
          <div class="mt-1 text-[0.84rem] text-ink-secondary">点击下方按钮添加你的判断或跟进计划</div>
        </div>

        <button
          class="inline-flex items-center justify-center rounded-xl border border-slate-400/15 bg-white px-4 py-2.5 text-[0.92rem] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          @click="handleEdit"
        >
          {{ note.content ? "编辑笔记" : "添加笔记" }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { ThemeReviewNote } from "../../../../lib/api";
import { fetchThemeReviewNote, updateThemeReviewNote } from "../../../../lib/api";

const props = defineProps<{
  themeId: string;
}>();

const note = ref<ThemeReviewNote>({ content: "", updatedAt: null });
const isEditing = ref(false);
const editContent = ref("");
const saving = ref(false);
const statusMessage = ref("");
const statusMessageClass = ref("text-ink-secondary");

async function loadNote() {
  if (!props.themeId) {
    return;
  }

  try {
    const result = await fetchThemeReviewNote(props.themeId);
    note.value = result;
  } catch {
    // Note doesn't exist yet, that's okay
    note.value = { content: "", updatedAt: null };
  }
}

function handleEdit() {
  editContent.value = note.value.content;
  isEditing.value = true;
  statusMessage.value = "";
}

function handleCancel() {
  isEditing.value = false;
  statusMessage.value = "";
}

async function handleSave() {
  saving.value = true;
  statusMessage.value = "";

  try {
    const updated = await updateThemeReviewNote(props.themeId, editContent.value);
    note.value = updated;
    isEditing.value = false;
    statusMessage.value = "保存成功";
    statusMessageClass.value = "text-green-600";

    // Clear success message after 3 seconds
    setTimeout(() => {
      if (statusMessage.value === "保存成功") {
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(/\//g, "-");
}

// Load note on mount
watch(() => props.themeId, loadNote, { immediate: true });
</script>
