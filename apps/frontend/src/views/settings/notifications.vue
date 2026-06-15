<template>
  <section class="flex flex-col gap-5">
    <header>
      <h2 class="mb-2 text-[1.8rem] font-semibold text-ink">通知偏好设置</h2>
      <p class="m-0 leading-7 text-[#675d4f]">配置通知的触发条件和显示方式，按主题、信号类型或渠道进行精细控制。</p>
    </header>

    <!-- Daily Summary Subscription -->
    <article class="rounded-[18px] border border-blue-200 bg-blue-50/50 p-[18px]">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-gray-900">日报订阅</h3>
          <p class="text-xs text-gray-500">每日自动推送工作台摘要</p>
        </div>
        <label class="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            :checked="dailySummary.enabled"
            class="peer sr-only"
            @change="toggleDailySummary"
          />
          <div class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
        </label>
      </div>
      <div v-if="dailySummary.enabled" class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">接收渠道</label>
          <select
            v-model="dailySummary.channel"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
            @change="saveDailySummaryConfig"
          >
            <option value="in_app">应用内</option>
            <option value="email">邮件</option>
            <option value="webhook">Webhook</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">推送时间</label>
          <input
            v-model="dailySummary.deliveryTime"
            type="time"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
            @change="saveDailySummaryConfig"
          />
        </div>
      </div>

      <!-- Channel-specific config for external channels -->
      <div v-if="dailySummary.enabled && dailySummary.channel === 'webhook'" class="mt-3 grid grid-cols-1 gap-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Webhook URL</label>
          <input
            v-model="channelConfig.webhook!.url"
            type="url"
            placeholder="https://example.com/webhook"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
            @change="saveChannelConfig"
          />
        </div>
      </div>

      <div v-if="dailySummary.enabled && dailySummary.channel === 'telegram'" class="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Bot Token</label>
          <input
            v-model="channelConfig.telegram!.botToken"
            type="password"
            placeholder="123456:ABC-DEF..."
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
            @change="saveChannelConfig"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">Chat ID</label>
          <input
            v-model="channelConfig.telegram!.chatId"
            type="text"
            placeholder="-1001234567890"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
            @change="saveChannelConfig"
          />
        </div>
      </div>

      <div v-if="dailySummary.enabled && dailySummary.channel === 'email'" class="mt-3 text-xs text-gray-500">
        邮件渠道暂未实现，请选择其他渠道。
      </div>
      <div v-if="dailySummaryStatus" class="mt-2 text-xs" :class="dailySummaryStatus === 'saved' ? 'text-green-600' : 'text-red-500'">
        {{ dailySummaryStatus === 'saved' ? '✓ 已保存' : '保存失败' }}
      </div>
    </article>

    <article class="rounded-[18px] border border-emerald-200 bg-emerald-50/50 p-[18px]">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-gray-900">股市盘后日报订阅</h3>
          <p class="text-xs text-gray-500">收盘后自动推送股市工作区盘后复盘</p>
        </div>
        <label class="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            :checked="stockMarketCloseReport.enabled"
            class="peer sr-only"
            @change="toggleStockMarketCloseReport"
          />
          <div class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
        </label>
      </div>
      <div v-if="stockMarketCloseReport.enabled" class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">接收渠道</label>
          <select
            v-model="stockMarketCloseReport.channel"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
            @change="saveStockMarketCloseReportConfig"
          >
            <option value="in_app">应用内</option>
            <option value="email">邮件</option>
            <option value="webhook">Webhook</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700">推送时间</label>
          <input
            v-model="stockMarketCloseReport.deliveryTime"
            type="time"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
            @change="saveStockMarketCloseReportConfig"
          />
        </div>
      </div>
      <div v-if="stockMarketCloseReportStatus" class="mt-2 text-xs" :class="stockMarketCloseReportStatus === 'saved' ? 'text-green-600' : 'text-red-500'">
        {{ stockMarketCloseReportStatus === 'saved' ? '✓ 已保存' : '保存失败' }}
      </div>
    </article>

    <div v-if="loading" class="rounded-2xl border border-slate-400/15 bg-white/78 p-8 text-center text-ink-body">
      加载中...
    </div>

    <div v-else-if="!preferences.length" class="rounded-2xl border border-slate-400/15 bg-white/78 p-8 text-center text-ink-body">
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
              class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2 text-[0.82rem] text-ink transition-colors hover:bg-slate-50"
              @click="toggleEnabled(pref)"
            >
              {{ pref.isEnabled ? '已启用' : '已禁用' }}
            </button>
            <button
              class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2 text-[0.82rem] text-ink transition-colors hover:bg-slate-50"
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
        <div class="mt-3 flex flex-wrap items-center gap-3 text-[0.82rem] text-ink-muted">
          <label class="flex items-center gap-1.5">
            <input
              type="checkbox"
              :checked="pref.priorityOnly"
              @change="togglePriorityOnly(pref)"
            />
            仅高优先级
          </label>
          <div class="flex items-center gap-1.5">
            <span>免打扰:</span>
            <input
              type="time"
              :value="pref.quietHoursStart || ''"
              class="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs"
              @change="updateQuietHours(pref, 'start', ($event.target as HTMLInputElement).value)"
            />
            <span>-</span>
            <input
              type="time"
              :value="pref.quietHoursEnd || ''"
              class="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs"
              @change="updateQuietHours(pref, 'end', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="flex items-center gap-1.5">
            <span>每小时上限:</span>
            <input
              type="number"
              :value="pref.maxPerHour || ''"
              min="0"
              placeholder="不限"
              class="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs"
              @change="updateMaxPerHour(pref, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </article>
    </div>

    <div class="flex flex-wrap gap-3">
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-dark px-5 py-2.5 text-ink-on-dark transition-colors hover:bg-[#3a3126]"
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
      <h3 class="mb-4 text-lg font-semibold text-ink-heading">新建通知偏好</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-[0.82rem] font-semibold text-ink-label">渠道</label>
          <select
            v-model="newPref.channel"
            class="w-full rounded-xl border border-slate-400/15 bg-white px-4 py-2.5 text-ink"
          >
            <option value="in_app">应用内</option>
            <option value="email">邮件</option>
            <option value="webhook">Webhook</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-[0.82rem] font-semibold text-ink-label">信号类型（可选）</label>
          <select
            v-model="newPref.signal"
            class="w-full rounded-xl border border-slate-400/15 bg-white px-4 py-2.5 text-ink"
          >
            <option value="">全部</option>
            <option value="30d_low">价格新低</option>
            <option value="liquidity_injection">流动性投放</option>
            <option value="liquidity_withdrawal">流动性回笼</option>
            <option value="new_announcement">新公告</option>
            <option value="content_update">内容更新</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-[0.82rem] font-semibold text-ink-label">主题ID（可选）</label>
          <input
            v-model="newPref.themeId"
            type="text"
            placeholder="留空表示所有主题"
            class="w-full rounded-xl border border-slate-400/15 bg-white px-4 py-2.5 text-ink"
          />
        </div>
        <div class="flex items-end gap-4">
          <label class="flex items-center gap-2">
            <input v-model="newPref.isEnabled" type="checkbox" />
            <span class="text-[0.82rem] text-ink-label">启用</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="newPref.isMuted" type="checkbox" />
            <span class="text-[0.82rem] text-ink-label">静音</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="newPref.priorityOnly" type="checkbox" />
            <span class="text-[0.82rem] text-ink-label">仅高优先级</span>
          </label>
        </div>
        <div class="flex items-end gap-3">
          <div>
            <label class="mb-1 block text-[0.78rem] text-ink-label">免打扰开始</label>
            <input v-model="newPref.quietHoursStart" type="time" class="rounded border border-slate-300 bg-white px-2 py-1 text-xs" />
          </div>
          <div>
            <label class="mb-1 block text-[0.78rem] text-ink-label">免打扰结束</label>
            <input v-model="newPref.quietHoursEnd" type="time" class="rounded border border-slate-300 bg-white px-2 py-1 text-xs" />
          </div>
          <div>
            <label class="mb-1 block text-[0.78rem] text-ink-label">每小时上限</label>
            <input v-model.number="newPref.maxPerHour" type="number" min="0" placeholder="不限" class="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-xs" />
          </div>
        </div>
      </div>
      <div class="mt-4">
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-xl bg-btn-dark px-5 py-2.5 text-ink-on-dark transition-colors hover:bg-[#3a3126]"
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
  fetchDailySummaryConfig,
  fetchNotificationPreferences,
  fetchStockMarketCloseReportConfig,
  loadChannelConfigFromBackend,
  saveChannelConfigToBackend,
  updateDailySummaryConfig,
  updateNotificationPreference,
  updateStockMarketCloseReportConfig,
  type ChannelConfig,
  type DailySummaryConfig,
  type NotificationPreference,
  type StockMarketCloseReportConfig,
} from "../../lib/api";

const preferences = ref<NotificationPreference[]>([]);
const loading = ref(false);
const showAddForm = ref(false);

// Daily summary subscription config
const dailySummary = ref({
  enabled: false,
  channel: "in_app",
  deliveryTime: "09:00",
});
const dailySummaryStatus = ref<"saved" | "failed" | "">("");
const stockMarketCloseReport = ref({
  enabled: false,
  channel: "in_app",
  deliveryTime: "16:25",
});
const stockMarketCloseReportStatus = ref<"saved" | "failed" | "">("");

// Channel-specific config for external delivery
const channelConfig = ref<ChannelConfig>({
  webhook: { url: "" },
  telegram: { botToken: "", chatId: "" },
});

const newPref = ref({
  channel: "in_app",
  signal: "",
  themeId: "",
  isEnabled: true,
  isMuted: false,
  priorityOnly: false,
  quietHoursStart: "",
  quietHoursEnd: "",
  maxPerHour: null as number | null,
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

async function updateQuietHours(pref: NotificationPreference, which: "start" | "end", value: string) {
  const patch = which === "start"
    ? { quietHoursStart: value || null }
    : { quietHoursEnd: value || null };
  const updated = await updateNotificationPreference(pref.id, patch);
  if (updated) {
    Object.assign(pref, updated);
  }
}

async function updateMaxPerHour(pref: NotificationPreference, value: string) {
  const num = value ? parseInt(value, 10) : null;
  const updated = await updateNotificationPreference(pref.id, {
    maxPerHour: num && num > 0 ? num : null,
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
    quietHoursStart: newPref.value.quietHoursStart || undefined,
    quietHoursEnd: newPref.value.quietHoursEnd || undefined,
    maxPerHour: newPref.value.maxPerHour,
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
    quietHoursStart: "",
    quietHoursEnd: "",
    maxPerHour: null,
  };
}

function toggleDailySummary() {
  dailySummary.value.enabled = !dailySummary.value.enabled;
  saveDailySummaryConfig();
}

async function saveDailySummaryConfig() {
  dailySummaryStatus.value = "";
  try {
    await updateDailySummaryConfig(dailySummary.value);
    dailySummaryStatus.value = "saved";
  } catch {
    dailySummaryStatus.value = "failed";
  }
  setTimeout(() => {
    dailySummaryStatus.value = "";
  }, 2000);
}

async function loadDailySummaryConfig() {
  try {
    const config = await fetchDailySummaryConfig();
    dailySummary.value = {
      enabled: config.enabled,
      channel: config.channel,
      deliveryTime: config.deliveryTime,
    };
  } catch {
    // Use defaults
  }

  // Load channel config from backend (with localStorage fallback)
  const channel = dailySummary.value.channel;
  if (channel !== "in_app") {
    try {
      const backendConfig = await loadChannelConfigFromBackend(channel);
      if (backendConfig) {
        if (backendConfig.webhook) channelConfig.value.webhook = backendConfig.webhook;
        if (backendConfig.telegram) channelConfig.value.telegram = backendConfig.telegram;
      }
    } catch {
      // Backend unavailable, try localStorage
      try {
        const stored = localStorage.getItem("dailySummaryChannelConfig");
        if (stored) {
          channelConfig.value = JSON.parse(stored);
        }
      } catch {
        // Use defaults
      }
    }
  }
}

function toggleStockMarketCloseReport() {
  stockMarketCloseReport.value.enabled = !stockMarketCloseReport.value.enabled;
  saveStockMarketCloseReportConfig();
}

async function saveStockMarketCloseReportConfig() {
  stockMarketCloseReportStatus.value = "";
  try {
    await updateStockMarketCloseReportConfig(stockMarketCloseReport.value);
    stockMarketCloseReportStatus.value = "saved";
  } catch {
    stockMarketCloseReportStatus.value = "failed";
  }
  setTimeout(() => {
    stockMarketCloseReportStatus.value = "";
  }, 2000);
}

async function loadStockMarketCloseReportConfig() {
  try {
    const config = await fetchStockMarketCloseReportConfig();
    stockMarketCloseReport.value = {
      enabled: config.enabled,
      channel: config.channel,
      deliveryTime: config.deliveryTime,
    };
  } catch {
    // Use defaults
  }
}

async function saveChannelConfig() {
  const channel = dailySummary.value.channel;
  try {
    // Save to backend
    if (channel !== "in_app") {
      const configToSave: Record<string, unknown> = {};
      if (channel === "webhook") configToSave.webhook = channelConfig.value.webhook;
      if (channel === "telegram") configToSave.telegram = channelConfig.value.telegram;
      await saveChannelConfigToBackend(channel, configToSave as ChannelConfig);
    }
    // Also save to localStorage as fallback
    localStorage.setItem("dailySummaryChannelConfig", JSON.stringify(channelConfig.value));
    dailySummaryStatus.value = "saved";
  } catch {
    dailySummaryStatus.value = "failed";
  }
  setTimeout(() => {
    dailySummaryStatus.value = "";
  }, 2000);
}

onMounted(() => {
  loadPreferences();
  loadDailySummaryConfig();
  loadStockMarketCloseReportConfig();
});
</script>
