<template>
  <header class="page-header">
    <div class="page-header-bar">
      <button class="back-icon-button" type="button" aria-label="返回上一级" @click="handleBack">
        <span aria-hidden="true">‹</span>
      </button>
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink :to="actionsPath">动作工作台</RouterLink>
        <span class="breadcrumb-divider">/</span>
        <span>事件详情</span>
      </nav>
    </div>
    <h2>{{ title }}</h2>
    <p>{{ summary }}</p>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

defineProps<{
  title: string;
  summary: string;
  handleBack: () => void;
}>();

const route = useRoute();
const actionsPath = computed(() => {
  const workspaceId = route.params.workspaceId;
  return typeof workspaceId === "string" ? `/workspace/${workspaceId}/actions` : "/";
});
</script>
