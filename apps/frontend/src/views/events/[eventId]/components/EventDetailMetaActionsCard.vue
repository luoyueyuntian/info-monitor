<template>
  <article class="card">
    <div class="card-topline">
      <h3>阅读与收藏</h3>
      <span class="text-[0.88rem] text-[#766f63]">{{ eventReadLabel(isRead) }} · {{ eventBookmarkLabel(isBookmarked) }}</span>
    </div>
    <div class="flex flex-wrap gap-3">
      <button
        class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving || isRead === true"
        @click="handleUpdateMeta({ isRead: true }, 'read')"
      >
        {{ saving && pendingAction === 'read' ? "正在更新..." : "标记已读" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving || isRead === false"
        @click="handleUpdateMeta({ isRead: false }, 'unread')"
      >
        {{ saving && pendingAction === 'unread' ? "正在更新..." : "标记未读" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving || isBookmarked === true"
        @click="handleUpdateMeta({ isBookmarked: true }, 'bookmark')"
      >
        {{ saving && pendingAction === 'bookmark' ? "正在更新..." : "加入收藏" }}
      </button>
      <button
        class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving || isBookmarked === false"
        @click="handleUpdateMeta({ isBookmarked: false }, 'unbookmark')"
      >
        {{ saving && pendingAction === 'unbookmark' ? "正在更新..." : "取消收藏" }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { eventBookmarkLabel, eventReadLabel } from "../../../../lib/presentation";

defineProps<{
  isRead: boolean;
  isBookmarked: boolean;
  saving: boolean;
  pendingAction: string;
  handleUpdateMeta: (
    input: {
      isRead?: boolean;
      isBookmarked?: boolean;
    },
    action: string,
  ) => void;
}>();
</script>
