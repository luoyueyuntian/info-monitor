<template>
  <article class="card">
    <h3>原始快照</h3>
    <div v-if="snapshots.length" class="list">
      <div v-for="snapshot in snapshots" :key="snapshot.id" class="list-item">
        <strong>快照 {{ snapshot.id }}</strong>
        <div class="meta-row">
          <span class="meta">抓取时间: {{ formatDateTimeLabel(snapshot.fetchedAt) }}</span>
          <span class="meta">关联运行: {{ snapshot.sourceRunId }}</span>
        </div>
        <div class="meta-row" v-if="snapshot.storagePath">
          <span class="meta">存储路径: {{ snapshot.storagePath }}</span>
        </div>
        <div class="muted source-config-preview">
          {{ snapshot.payloadPreview }}
        </div>
      </div>
    </div>
    <div v-else class="empty-state">这个来源当前还没有原始快照。</div>
  </article>
</template>

<script setup lang="ts">
import type { SourceDetail } from "../../../../lib/api";
import { formatDateTimeLabel } from "../../../../lib/presentation";

defineProps<{
  snapshots: SourceDetail["snapshots"];
}>();
</script>
