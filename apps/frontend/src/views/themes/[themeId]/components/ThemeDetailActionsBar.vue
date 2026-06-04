<template>
  <div class="actions">
    <button class="button secondary" :disabled="runningAllSources" @click="handleRunAllSources">
      {{ runningAllSources ? "正在入队..." : "立即运行全部来源" }}
    </button>
    <button
      class="button secondary"
      type="button"
      :disabled="savingThemeArchive"
      @click="handleToggleThemeArchived"
    >
      {{
        savingThemeArchive
          ? "正在更新..."
          : themeStatus === "archived"
            ? "恢复主题"
            : "归档主题"
      }}
    </button>
    <button class="button secondary" type="button" @click="toggleEditThemeForm">
      {{ showEditThemeForm ? "收起编辑主题" : "编辑主题" }}
    </button>
    <button class="button" type="button" @click="toggleAddSourceForm">
      {{ showAddSourceForm ? "收起新增来源" : "新增来源" }}
    </button>
    <button class="button secondary" type="button" :disabled="deletingTheme" @click="handleDeleteTheme">
      {{ deletingTheme ? "正在删除..." : "删除主题" }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  runningAllSources: boolean;
  savingThemeArchive: boolean;
  themeStatus: string;
  showEditThemeForm: boolean;
  showAddSourceForm: boolean;
  deletingTheme: boolean;
  handleRunAllSources: () => void;
  handleToggleThemeArchived: () => void;
  toggleEditThemeForm: () => void;
  toggleAddSourceForm: () => void;
  handleDeleteTheme: () => void;
}>();
</script>
