<template>
  <header class="page-header">
    <div class="page-header-bar">
      <button class="back-icon-button" type="button" aria-label="返回上一级" @click="handleBack">
        <span aria-hidden="true">‹</span>
      </button>
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink :to="sourcesPath">来源状态</RouterLink>
        <span class="breadcrumb-divider">/</span>
        <span>{{ sourceName }}</span>
      </nav>
    </div>
    <h2>{{ sourceName }}</h2>
    <p>
      {{ themeName }} · {{ sourceTypeLabel(sourceType) }} ·
      {{ isPaused ? "已暂停" : "运行中" }}
      <span v-if="onboardingStatus && onboardingStatus !== 'active'" class="ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold" :class="onboardingStatus === 'draft' ? 'bg-slate-200/80 text-slate-600' : 'bg-amber-100 text-amber-700'">
        {{ onboardingStatusLabel(onboardingStatus) }}
      </span>
    </p>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import type { SourceOnboardingStatus } from "@info-monitor/shared-contracts";
import { sourceTypeLabel } from "../../../../lib/presentation";

const props = defineProps<{
  sourceName: string;
  themeId: string;
  themeName: string;
  sourceType?: string;
  isPaused?: boolean;
  onboardingStatus?: SourceOnboardingStatus;
  handleBack: () => void;
}>();

function onboardingStatusLabel(status: SourceOnboardingStatus): string {
  switch (status) {
    case "draft": return "草稿";
    case "ready_to_test": return "待测试";
    default: return "";
  }
}

const route = useRoute();
const sourcesPath = computed(() => {
  const workspaceId = route.params.workspaceId;
  return typeof workspaceId === "string"
    ? { path: `/workspace/${workspaceId}/sources` }
    : { path: "/sources/status", query: { themeId: props.themeId } };
});
</script>
