<template>
  <section class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <h3 class="mb-4 text-[1.05rem] font-semibold text-[#2f2618]">工作流快速入口</h3>
    <p class="mb-4 text-[0.88rem] text-[#6f665a]">快速完成事件处理流程：发现 → 判断 → 标记 → 归档</p>

    <!-- Workflow Steps -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Step 1: Discover -->
      <div class="flex flex-col gap-2 rounded-xl border border-slate-400/15 bg-slate-50/80 p-4">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[0.78rem] font-bold text-blue-700">1</span>
          <span class="text-[0.88rem] font-semibold text-[#2f2618]">发现</span>
        </div>
        <p class="text-[0.82rem] text-[#6f665a]">查看新事件和通知</p>
        <div class="flex flex-col gap-1.5">
          <RouterLink
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            to="/notifications?status=pending"
          >
            📬 未读通知
            <span v-if="unreadCount > 0" class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.72rem] text-amber-700">
              {{ unreadCount }}
            </span>
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            to="/events?status=open"
          >
            📋 待处理事件
            <span v-if="openEventCount > 0" class="rounded-full bg-blue-100 px-1.5 py-0.5 text-[0.72rem] text-blue-700">
              {{ openEventCount }}
            </span>
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            to="/"
          >
            📊 收件箱概览
          </RouterLink>
        </div>
      </div>

      <!-- Step 2: Analyze -->
      <div class="flex flex-col gap-2 rounded-xl border border-slate-400/15 bg-slate-50/80 p-4">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[0.78rem] font-bold text-violet-700">2</span>
          <span class="text-[0.88rem] font-semibold text-[#2f2618]">判断</span>
        </div>
        <p class="text-[0.82rem] text-[#6f665a]">分析事件影响和原因</p>
        <div class="flex flex-col gap-1.5">
          <RouterLink
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            to="/themes"
          >
            🎯 主题分析
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            to="/sources/health"
          >
            🏥 来源健康
          </RouterLink>
          <RouterLink
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            to="/notifications/audit"
          >
            📜 审计日志
          </RouterLink>
        </div>
      </div>

      <!-- Step 3: Act -->
      <div class="flex flex-col gap-2 rounded-xl border border-slate-400/15 bg-slate-50/80 p-4">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[0.78rem] font-bold text-emerald-700">3</span>
          <span class="text-[0.88rem] font-semibold text-[#2f2618]">标记</span>
        </div>
        <p class="text-[0.82rem] text-[#6f665a]">更新事件状态</p>
        <div class="flex flex-col gap-1.5">
          <button
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            @click="$emit('batchRead')"
          >
            ✅ 批量标记已读
          </button>
          <button
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            @click="$emit('markAllRead')"
          >
            📖 全部标记已读
          </button>
          <RouterLink
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            to="/settings/notifications"
          >
            ⚙️ 通知偏好
          </RouterLink>
        </div>
      </div>

      <!-- Step 4: Archive -->
      <div class="flex flex-col gap-2 rounded-xl border border-slate-400/15 bg-slate-50/80 p-4">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[0.78rem] font-bold text-slate-700">4</span>
          <span class="text-[0.88rem] font-semibold text-[#2f2618]">归档</span>
        </div>
        <p class="text-[0.82rem] text-[#6f665a]">清理已处理内容</p>
        <div class="flex flex-col gap-1.5">
          <button
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            @click="$emit('clearRead')"
          >
            🗑️ 清理已读通知
          </button>
          <button
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            @click="$emit('resolveAll')"
          >
            ✨ 归档已处理事件
          </button>
          <RouterLink
            class="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#6b4f1f] hover:underline"
            to="/watchlist"
          >
            👀 关注列表
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-400/15 bg-slate-50/80 p-3 text-[0.82rem]">
      <span class="text-[#6f665a]">
        📊 今日统计:
      </span>
      <span class="text-emerald-600">
        ✅ {{ stats.readToday }} 已读
      </span>
      <span class="text-blue-600">
        📝 {{ stats.trackedToday }} 跟踪中
      </span>
      <span class="text-slate-500">
        📦 {{ stats.archivedToday }} 已归档
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  unreadCount: number;
  openEventCount: number;
  stats: {
    readToday: number;
    trackedToday: number;
    archivedToday: number;
  };
}>();

defineEmits<{
  batchRead: [];
  markAllRead: [];
  clearRead: [];
  resolveAll: [];
}>();
</script>
