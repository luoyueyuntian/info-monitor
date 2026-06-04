<template>
  <div class="flex flex-wrap gap-3">
    <button class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60" :disabled="runningAllSources" @click="handleRunAllSources">
      {{ runningAllSources ? "正在入队..." : "立即运行全部来源" }}
    </button>
    <button
      class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
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
    <button class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" type="button" @click="toggleEditThemeForm">
      {{ showEditThemeForm ? "收起编辑主题" : "编辑主题" }}
    </button>
    <button class="inline-flex items-center justify-center rounded-xl bg-[#2f2618] px-4 py-2.5 text-[#fff7e7] transition-colors hover:bg-[#241d12]" type="button" @click="toggleAddSourceForm">
      {{ showAddSourceForm ? "收起新增来源" : "新增来源" }}
    </button>
    <button class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60" type="button" :disabled="deletingTheme" @click="handleDeleteTheme">
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
