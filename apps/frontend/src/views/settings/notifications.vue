<template>
  <section class="flex flex-col gap-5">
    <header>
      <h2 class="mb-2 text-[1.8rem] font-semibold text-[#1d1d1d]">通知偏好设置</h2>
      <p class="m-0 leading-7 text-[#675d4f]">配置通知的触发条件和显示方式，按主题、信号类型或渠道进行精细控制。</p>
    </header>

    <div v-if="loading" class="rounded-2xl border border-slate-400/15 bg-white/78 p-8 text-center text-[#6f665a]">
      加载中...
    </div>

    <div v-else-if="!preferences.length" class="rounded-2xl border border-slate-400/15 bg-white/78 p-8 text-center text-[#6f665a]">
      暂无通知偏好配置。点击下方按钮添加。
    </div>

    <div v-else class="flex flex-col gap-4">
      <article
        v-for="pref in preferences"
        :key="pref.id"
        class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[0.78rem] font-semibold text-slate-600">
              {{ pref.channel }}
            </span>
            <span v-if="pref.themeId" class="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-[0.78rem] font-semibold text-blue-700">
              主题: {{ pref.themeId }}
            </span>
            <span v-if="pref.signal" class="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-[0.78rem] font-semibold text-emerald-700">
              信号: {{ pref.signal }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-3 py-2 text-[0.82rem] text-[#1d1d1d] transition-colors hover:bg-slate-50"
              @click="toggleEnabled(pref)"
            >
              {{ pref.isEnabled ? '已启用' : '已禁用' }}
            </button>
            <button
              class="inline-flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.22)] bg-white px-3 py-2 text-[0.82rem] text-[#1d1d1d] transition-colors hover:bg-slate-50"
              @click="toggleMuted(pref)"
            >
              {{ pref.isMuted ? '已静音' : '未静音' }}
            </button>
            <button
              class="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2 text-[0.82rem] text-rose-600 transition-colors hover:bg-rose-50"
              @click="handleDelete(pref.id)"
            >
              删除
            </button>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-3 text-[0.82rem] text-[#8a8078]">
          <label class="flex items-center gap-1.5">
            <input
              type="checkbox"
              :checked="pref.priorityOnly"
              @change="togglePriorityOnly(pref)"
            />
            仅高优先级
          </label>
        </div>
      </article>
    </div>

    <div class="flex flex-wrap gap-3">
      <button
        class="inline-flex items-center justify-center rounded-xl bg-[#2f2618] px-5 py-2.5 text-[#fff7e7] transition-colors hover:bg-[#3a3126]"
        @click="showAddForm = !showAddForm"
      >
        {{ showAddForm ? '取消' : '添加偏好' }}
      </button>
    </div>

    <form
      v-if="showAddForm"
      class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
      @submit.prevent="handleCreate"
    >
      <h3 class="mb-4 text-lg font-semibold text-[#2f2618]">新建通知偏好</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-[0.82rem] font-semibold text-[#6b5e49]">渠道</label>
          <select
            v-model="newPref.channel"
            class="w-full rounded-xl border border-slate-400/15 bg-white px-4 py-2.5 text-[#1d1d1d]"
          >
            <option value="in_app">应用内</option>
            <option value="email">邮件</option>
            <option value="webhook">Webhook</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-[0.82rem] font-semibold text-[#6b5e49]">信号类型（可选）</label>
          <select
            v-model="newPref.signal"
            class="w-full rounded-xl border border-slate-400/15 bg-white px-4 py-2.5 text-[#1d1d1d]"
          >
            <option value="">全部</option>
            <option value="30d_low">价格新低</option>
            <option value="bullish">利好信号</option>
            <option value="bearish">利空信号</option>
            <option value="new_announcement">新公告</option>
            <option value="content_update">内容更新</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-[0.82rem] font-semibold text-[#6b5e49]">主题ID（可选）</label>
          <input
            v-model="newPref.themeId"
            type="text"
            placeholder="留空表示所有主题"
            class="w-full rounded-xl border border-slate-400/15 bg-white px-4 py-2.5 text-[#1d1d1d]"
          />
        </div>
        <div class="flex items-end gap-4">
          <label class="flex items-center gap-2">
            <input v-model="newPref.isEnabled" type="checkbox" />
            <span class="text-[0.82rem] text-[#6b5e49]">启用</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="newPref.isMuted" type="checkbox" />
            <span class="text-[0.82rem] text-[#6b5e49]">静音</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="newPref.priorityOnly" type="checkbox" />
            <span class="text-[0.82rem] text-[#6b5e49]">仅高优先级</span>
          </label>
        </div>
      </div>
      <div class="mt-4">
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-xl bg-[#2f2618] px-5 py-2.5 text-[#fff7e7] transition-colors hover:bg-[#3a3126]"
        >
          创建
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import {
  createNotificationPreference,
  deleteNotificationPreference,
  fetchNotificationPreferences,
  updateNotificationPreference,
  type NotificationPreference,
} from "../../lib/api";

const preferences = ref<NotificationPreference[]>([]);
const loading = ref(false);
const showAddForm = ref(false);

const newPref = ref({
  channel: "in_app",
  signal: "",
  themeId: "",
  isEnabled: true,
  isMuted: false,
  priorityOnly: false,
});

async function loadPreferences() {
  loading.value = true;
  try {
    preferences.value = await fetchNotificationPreferences();
  } finally {
    loading.value = false;
  }
}

async function toggleEnabled(pref: NotificationPreference) {
  const updated = await updateNotificationPreference(pref.id, {
    isEnabled: !pref.isEnabled,
  });
  if (updated) {
    Object.assign(pref, updated);
  }
}

async function toggleMuted(pref: NotificationPreference) {
  const updated = await updateNotificationPreference(pref.id, {
    isMuted: !pref.isMuted,
  });
  if (updated) {
    Object.assign(pref, updated);
  }
}

async function togglePriorityOnly(pref: NotificationPreference) {
  const updated = await updateNotificationPreference(pref.id, {
    priorityOnly: !pref.priorityOnly,
  });
  if (updated) {
    Object.assign(pref, updated);
  }
}

async function handleDelete(id: string) {
  const success = await deleteNotificationPreference(id);
  if (success) {
    preferences.value = preferences.value.filter((p) => p.id !== id);
  }
}

async function handleCreate() {
  const created = await createNotificationPreference({
    channel: newPref.value.channel,
    signal: newPref.value.signal || undefined,
    themeId: newPref.value.themeId || undefined,
    isEnabled: newPref.value.isEnabled,
    isMuted: newPref.value.isMuted,
    priorityOnly: newPref.value.priorityOnly,
  });

  preferences.value.unshift(created);
  showAddForm.value = false;
  newPref.value = {
    channel: "in_app",
    signal: "",
    themeId: "",
    isEnabled: true,
    isMuted: false,
    priorityOnly: false,
  };
}

onMounted(loadPreferences);
</script>
