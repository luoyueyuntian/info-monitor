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

        <!-- Structured fields -->
        <div class="grid gap-3 sm:grid-cols-3">
          <!-- Status selector -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">审核状态</label>
            <select
              v-model="editStatus"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#8a5b1f] focus:outline-none focus:ring-1 focus:ring-[#8a5b1f]"
            >
              <option value="">未设置</option>
              <option value="pending_review">待审核</option>
              <option value="reviewed">已审核</option>
              <option value="tracking">跟踪中</option>
            </select>
          </div>

          <!-- Next review date -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">下次审核日期</label>
            <input
              v-model="editNextReviewDate"
              type="date"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#8a5b1f] focus:outline-none focus:ring-1 focus:ring-[#8a5b1f]"
            />
          </div>

          <!-- Tags -->
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">标签</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="tag in availableTags"
                :key="tag.value"
                class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs hover:bg-gray-50"
              >
                <input
                  v-model="editTags"
                  type="checkbox"
                  :value="tag.value"
                  class="rounded border-gray-300 text-[#8a5b1f] focus:ring-[#8a5b1f]"
                />
                {{ tag.label }}
              </label>
            </div>
          </div>
        </div>

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
          v-if="note.content || note.status || (note.tags && note.tags.length > 0)"
          class="rounded-xl border border-slate-400/15 bg-white/70 px-4 py-3.5"
        >
          <!-- Structured fields display -->
          <div v-if="note.status || (note.tags && note.tags.length > 0) || note.nextReviewDate" class="mb-3 flex flex-wrap items-center gap-2">
            <span
              v-if="note.status"
              :class="statusBadgeClass(note.status)"
              class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            >
              {{ statusLabel(note.status) }}
            </span>
            <span
              v-for="tag in (note.tags ?? [])"
              :key="tag"
              class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
            >
              {{ tagLabel(tag) }}
            </span>
            <span v-if="note.nextReviewDate" class="text-xs text-gray-500">
              下次审核: {{ formatDate(note.nextReviewDate) }}
            </span>
          </div>

          <div v-if="note.content" class="whitespace-pre-wrap text-[0.95rem] leading-6 text-[#1f2937]">{{ note.content }}</div>
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

const availableTags = [
  { value: "price_opportunity", label: "价格机会" },
  { value: "policy_watch", label: "政策关注" },
  { value: "competitor_tracking", label: "竞品跟踪" },
  { value: "risk_alert", label: "风险预警" },
  { value: "opportunity", label: "投资机会" },
];

const note = ref<ThemeReviewNote>({ content: "", updatedAt: null });
const isEditing = ref(false);
const editContent = ref("");
const editStatus = ref<string>("");
const editTags = ref<string[]>([]);
const editNextReviewDate = ref<string>("");
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
  editStatus.value = note.value.status ?? "";
  editTags.value = [...(note.value.tags ?? [])]; // Defensive clone to avoid mutating display state
  editNextReviewDate.value = note.value.nextReviewDate ?? "";
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
    const validStatuses = ["pending_review", "reviewed", "tracking"] as const;
    const statusValue = validStatuses.includes(editStatus.value as typeof validStatuses[number])
      ? editStatus.value as typeof validStatuses[number]
      : undefined;

    const updated = await updateThemeReviewNote(
      props.themeId,
      editContent.value,
      statusValue,
      editTags.value.length > 0 ? editTags.value : undefined,
      editNextReviewDate.value || null,
    );
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

function statusLabel(status: string): string {
  switch (status) {
    case "pending_review":
      return "待审核";
    case "reviewed":
      return "已审核";
    case "tracking":
      return "跟踪中";
    default:
      return status;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending_review":
      return "bg-yellow-100 text-yellow-800";
    case "reviewed":
      return "bg-green-100 text-green-800";
    case "tracking":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function tagLabel(tag: string): string {
  const found = availableTags.find((t) => t.value === tag);
  return found?.label ?? tag;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replace(/\//g, "-");
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
