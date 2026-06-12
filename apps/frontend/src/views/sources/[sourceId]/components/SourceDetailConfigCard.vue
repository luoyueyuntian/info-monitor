<template>
  <article class="card">
    <h3>配置概览</h3>
    <dl class="mt-2.5 grid gap-1.5">
      <div class="flex flex-wrap gap-1.5">
        <dt class="font-bold text-[#473924]">Adapter:</dt>
        <dd class="m-0 text-[#695e4c]">{{ formatMaybeLabel(adapterKey) }}</dd>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <dt class="font-bold text-[#473924]">暂停:</dt>
        <dd class="m-0 text-[#695e4c]">{{ isPaused ? "是" : "否" }}</dd>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <dt class="font-bold text-[#473924]">最近成功:</dt>
        <dd class="m-0 text-[#695e4c]">{{ formatDateTimeLabel(latestSuccessAt) }}</dd>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <dt class="font-bold text-[#473924]">最近失败:</dt>
        <dd class="m-0 text-[#695e4c]">{{ formatDateTimeLabel(latestFailureAt) }}</dd>
      </div>
    </dl>
    <div class="mt-3 rounded-xl border border-slate-400/15 bg-slate-50/90 p-3 font-mono text-[0.84rem] whitespace-pre-wrap break-words text-ink-body">
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
