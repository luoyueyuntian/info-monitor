<template>
  <article class="card">
    <div class="card-topline">
      <h3>来源列表</h3>
      <span class="text-[0.88rem] text-[#766f63]">共 {{ sources.length }} 个来源</span>
    </div>
    <div class="flex flex-col gap-3">
      <div
        v-for="source in sources"
        :key="source.id"
        class="rounded-2xl border px-4 py-3.5"
        :class="isIncrementalSource(source) ? 'border-[rgba(120,120,120,0.28)] bg-white/95 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]' : 'border-slate-400/15 bg-slate-50/90'"
      >
        <label class="mb-3 flex items-center gap-2.5 text-[0.88rem] text-[#766f63]">
          <input
            :checked="selectedSourceIds.includes(source.id)"
            type="checkbox"
            @change="toggleSourceSelection(source.id)"
          />
          选中来源
        </label>
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span :class="pillToneClass(source.status)">{{ sourceStatusLabel(source.status) }}</span>
          <span :class="pillToneClass()" v-if="source.themeType">{{ themeTypeLabel(source.themeType) }}</span>
          <span :class="pillToneClass(themeImpactTone({ type: source.themeType ?? '', latestEventSignal: source.latestEventSignal ?? null }))" v-if="source.latestEventSignal">
            {{ impactToneLabel(themeImpactTone({ type: source.themeType ?? '', latestEventSignal: source.latestEventSignal ?? null })) }}
          </span>
          <span :class="pillToneClass(source.latestRunStatus)" v-if="source.latestRunStatus">
            {{ runStatusLabel(source.latestRunStatus) }}
          </span>
          <span :class="pillToneClass('neutral')" v-if="isIncrementalSource(source)">本次新增</span>
        </div>
        <RouterLink class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-[#6b4f1f]" :to="`/sources/${source.id}`">
          {{ source.name }}
          <span aria-hidden="true" class="text-base leading-none">›</span>
        </RouterLink>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-[#766f63]">主题: {{ source.themeName }}</span>
          <span class="text-[0.88rem] text-[#766f63]">来源类型: {{ sourceTypeLabel(source.sourceType) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">Adapter: {{ formatMaybeLabel(source.adapterKey) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">暂停: {{ source.isPaused ? "是" : "否" }}</span>
        </div>
        <div class="flex flex-wrap gap-x-2.5 gap-y-2">
          <span class="text-[0.88rem] text-[#766f63]">最近运行: {{ formatDateTimeLabel(source.latestRunAt) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">最近成功: {{ formatDateTimeLabel(source.latestSuccessAt) }}</span>
          <span class="text-[0.88rem] text-[#766f63]">最近失败: {{ formatDateTimeLabel(source.latestFailureAt) }}</span>
        </div>
        <div v-if="source.lastErrorMessage" class="text-[#6f665a]">
          最近错误: {{ source.lastErrorMessage }}
        </div>
        <div class="mt-3 flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
            :to="{ path: `/themes/${source.themeId}`, query: { section: themeImpactTone({ type: source.themeType ?? '', latestEventSignal: source.latestEventSignal ?? null }) === 'negative' ? 'analysis' : 'timeline' } }"
          >
            {{ themeImpactTone({ type: source.themeType ?? "", latestEventSignal: source.latestEventSignal ?? null }) === "negative" ? "查看主题分析" : "查看主题时间线" }}
          </RouterLink>
          <button class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60" :disabled="pendingSourceId === source.id" @click="handleTrigger(source.id)">
            {{ pendingSourceId === source.id ? "正在入队..." : "立即运行" }}
          </button>
          <button
            class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="togglingSourceId === source.id"
            @click="handleToggleSourcePaused(source.id, !source.isPaused)"
          >
            {{
              togglingSourceId === source.id
                ? "正在更新..."
                : source.isPaused
                  ? "恢复来源"
                  : "暂停来源"
            }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { SourceStatus } from "../../../../lib/api";
import { impactToneLabel, themeImpactTone } from "../../../../lib/impact";
import {
  formatDateTimeLabel,
  formatMaybeLabel,
  pillToneClass,
  runStatusLabel,
  sourceStatusLabel,
  sourceTypeLabel,
  themeTypeLabel,
} from "../../../../lib/presentation";

defineProps<{
  sources: SourceStatus[];
  selectedSourceIds: string[];
  pendingSourceId: string | null;
  togglingSourceId: string | null;
  isIncrementalSource: (source: SourceStatus) => boolean;
  toggleSourceSelection: (sourceId: string) => void;
  handleTrigger: (sourceId: string) => void;
  handleToggleSourcePaused: (sourceId: string, isPaused: boolean) => void;
}>();
</script>
