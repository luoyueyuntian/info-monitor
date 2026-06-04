<template>
  <header class="page-header">
    <div class="page-header-bar">
      <button class="back-icon-button" type="button" aria-label="返回上一级" @click="onBack">
        <span aria-hidden="true">‹</span>
      </button>
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/themes">主题中心</RouterLink>
        <span class="breadcrumb-divider">/</span>
        <span>{{ themeName }}</span>
      </nav>
    </div>
    <h2>{{ themeName }}</h2>
    <p>
      {{ themeTypeLabel(themeType) }}主题，包含 {{ sourceCount }} 个来源，
      最近有 {{ eventCount }} 条事件。
    </p>
  </header>
</template>

<script setup lang="ts">
import { themeTypeLabel } from "../../../../lib/presentation";

defineProps<{
  themeName: string;
  themeType: string;
  sourceCount: number;
  eventCount: number;
  onBack: () => void;
}>();
</script>
