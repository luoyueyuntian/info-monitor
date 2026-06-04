<template>
  <header class="page-header">
    <div class="page-header-bar">
      <button class="back-icon-button" type="button" aria-label="返回上一级" @click="handleBack">
        <span aria-hidden="true">‹</span>
      </button>
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/">收件箱</RouterLink>
        <span class="breadcrumb-divider">/</span>
        <span>{{ title }}</span>
      </nav>
    </div>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  handleBack: () => void;
}>();
</script>
