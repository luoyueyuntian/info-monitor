<template>
  <article class="card">
    <h3>配置概览</h3>
    <dl class="record-kv">
      <div>
        <dt>Adapter:</dt>
        <dd>{{ formatMaybeLabel(adapterKey) }}</dd>
      </div>
      <div>
        <dt>暂停:</dt>
        <dd>{{ isPaused ? "是" : "否" }}</dd>
      </div>
      <div>
        <dt>最近成功:</dt>
        <dd>{{ formatDateTimeLabel(latestSuccessAt) }}</dd>
      </div>
      <div>
        <dt>最近失败:</dt>
        <dd>{{ formatDateTimeLabel(latestFailureAt) }}</dd>
      </div>
    </dl>
    <div class="muted source-config-preview">
      {{ JSON.stringify(config ?? {}, null, 2) }}
    </div>
  </article>
</template>

<script setup lang="ts">
import { formatDateTimeLabel, formatMaybeLabel } from "../../../../lib/presentation";

defineProps<{
  adapterKey?: string;
  isPaused?: boolean;
  latestSuccessAt?: string | null;
  latestFailureAt?: string | null;
  config?: Record<string, unknown>;
}>();
</script>
