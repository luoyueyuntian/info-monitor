<template>
  <article class="card">
    <div class="card-topline">
      <h3>来源列表</h3>
      <span class="meta">共 {{ sources.length }} 个来源</span>
    </div>
    <div class="list">
      <div
        v-for="source in sources"
        :key="source.id"
        class="list-item"
        :class="{ 'list-item--delta': isIncrementalSource(source) }"
      >
        <div class="theme-topline">
          <span :class="pillToneClass(source.status)">{{ sourceStatusLabel(source.status) }}</span>
          <span class="pill" v-if="source.themeType">{{ themeTypeLabel(source.themeType) }}</span>
          <span :class="pillToneClass(source.latestRunStatus)" v-if="source.latestRunStatus">
            {{ runStatusLabel(source.latestRunStatus) }}
          </span>
          <span class="pill tone-neutral" v-if="isIncrementalSource(source)">本次新增</span>
        </div>
        <RouterLink class="text-action" :to="`/sources/${source.id}`">
          {{ source.name }}
          <span aria-hidden="true">›</span>
        </RouterLink>
        <div class="meta-row">
          <span class="meta">主题: {{ source.themeName }}</span>
          <span class="meta">来源类型: {{ sourceTypeLabel(source.sourceType) }}</span>
          <span class="meta">Adapter: {{ formatMaybeLabel(source.adapterKey) }}</span>
          <span class="meta">暂停: {{ source.isPaused ? "是" : "否" }}</span>
        </div>
        <div class="meta-row">
          <span class="meta">最近运行: {{ formatDateTimeLabel(source.latestRunAt) }}</span>
          <span class="meta">最近成功: {{ formatDateTimeLabel(source.latestSuccessAt) }}</span>
          <span class="meta">最近失败: {{ formatDateTimeLabel(source.latestFailureAt) }}</span>
        </div>
        <div v-if="source.lastErrorMessage" class="muted">
          最近错误: {{ source.lastErrorMessage }}
        </div>
        <div class="actions inline">
          <button class="button secondary" :disabled="pendingSourceId === source.id" @click="handleTrigger(source.id)">
            {{ pendingSourceId === source.id ? "正在入队..." : "立即运行" }}
          </button>
          <button
            class="button secondary"
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
  pendingSourceId: string | null;
  togglingSourceId: string | null;
  isIncrementalSource: (source: SourceStatus) => boolean;
  handleTrigger: (sourceId: string) => void;
  handleToggleSourcePaused: (sourceId: string, isPaused: boolean) => void;
}>();
</script>
