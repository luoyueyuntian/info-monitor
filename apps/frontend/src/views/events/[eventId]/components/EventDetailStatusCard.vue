<template>
  <article class="card">
    <div class="card-topline">
      <h3>处理状态</h3>
      <span class="meta">{{ eventStatusLabel(status) }}</span>
    </div>
    <div class="actions">
      <button
        class="button secondary"
        :disabled="saving || status === 'open'"
        @click="handleUpdateStatus('open')"
      >
        {{ saving && pendingStatus === 'open' ? "正在更新..." : "标记待处理" }}
      </button>
      <button
        class="button secondary"
        :disabled="saving || status === 'tracking'"
        @click="handleUpdateStatus('tracking')"
      >
        {{ saving && pendingStatus === 'tracking' ? "正在更新..." : "标记关注中" }}
      </button>
      <button
        class="button secondary"
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
