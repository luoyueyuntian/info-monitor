<template>
  <section class="mb-5 rounded-[24px] border border-slate-400/15 bg-white/84 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-ink-label">Stock Market Module</div>
        <div class="mt-1 text-[0.95rem] text-ink-body">股市板块内导航</div>
      </div>
      <nav class="flex flex-wrap gap-2">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-full px-3.5 py-2 text-[0.88rem] font-semibold transition-colors"
          :class="navItemClass(item.to)"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const workspaceId = computed(() => String(route.params.workspaceId ?? "stock-market"));
const base = computed(() => `/workspace/${workspaceId.value}`);
const navItems = computed(() => [
  { label: "大盘", to: `${base.value}/dashboard` },
  { label: "动作", to: `${base.value}/actions` },
  { label: "主题", to: `${base.value}/topics` },
  { label: "来源", to: `${base.value}/sources` },
  { label: "报告", to: `${base.value}/reports` },
  { label: "数据源目录", to: "/sources/catalog" },
]);

function navItemClass(target: string) {
  return route.path === target || route.path.startsWith(`${target}/`)
    ? "bg-[#143149] text-white"
    : "bg-slate-100 text-slate-700 hover:bg-slate-200";
}
</script>
<script setup lang="ts">
// NOTE: This will append, but we want to insert a new nav item for Source Catalog.
</script>
