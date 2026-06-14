<template>
  <header class="page-header">
    <div class="page-title-row">
      <div>
        <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">{{ workspace.shortLabel }}</div>
        <h2>{{ title }}</h2>
      </div>
      <span v-if="statusLabel" :class="pillToneClass(statusTone)">
        {{ statusLabel }}
      </span>
    </div>
    <p>{{ description }}</p>
  </header>
</template>

<script setup lang="ts">
import { pillToneClass } from "../../../lib/presentation";
import type { WorkspaceDefinition } from "../../../lib/workspaces";

defineProps<{
  workspace: WorkspaceDefinition;
  title: string;
  description: string;
  statusLabel?: string;
  statusTone?: string;
}>();
</script>
