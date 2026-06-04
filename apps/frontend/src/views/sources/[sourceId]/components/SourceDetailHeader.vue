<template>
  <header class="page-header">
    <div class="page-header-bar">
      <button class="back-icon-button" type="button" aria-label="返回上一级" @click="handleBack">
        <span aria-hidden="true">‹</span>
      </button>
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/sources/status">来源状态</RouterLink>
        <span class="breadcrumb-divider">/</span>
        <span>{{ sourceName }}</span>
      </nav>
    </div>
    <h2>{{ sourceName }}</h2>
    <p>
      {{ themeName }} · {{ sourceTypeLabel(sourceType) }} ·
      {{ isPaused ? "已暂停" : "运行中" }}
    </p>
  </header>
</template>

<script setup lang="ts">
import { sourceTypeLabel } from "../../../../lib/presentation";

defineProps<{
  sourceName: string;
  themeName: string;
  sourceType?: string;
  isPaused?: boolean;
  handleBack: () => void;
}>();
</script>
