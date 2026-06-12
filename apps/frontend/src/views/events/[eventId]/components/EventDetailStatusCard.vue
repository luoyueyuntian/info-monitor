<template>
  <article class="card">
    <div class="card-topline">
      <h3>处理状态</h3>
      <span class="text-[0.88rem] text-ink-secondary">{{ eventStatusLabel(status) }}</span>
    </div>
    <div class="flex flex-wrap gap-3">
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving || status === 'open'"
        @click="handleUpdateStatus('open')"
      >
        {{ saving && pendingStatus === 'open' ? "正在更新..." : "标记待处理" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving || status === 'tracking'"
        @click="handleUpdateStatus('tracking')"
      >
        {{ saving && pendingStatus === 'tracking' ? "正在更新..." : "标记关注中" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving || status === 'ignored'"
        @click="handleUpdateStatus('ignored')"
      >
        {{ saving && pendingStatus === 'ignored' ? "正在更新..." : "标记已忽略" }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { eventStatusLabel } from "../../../../lib/presentation";

defineProps<{
  status: string;
  saving: boolean;
  pendingStatus: string;
  handleUpdateStatus: (status: string) => void;
}>();
</script>
