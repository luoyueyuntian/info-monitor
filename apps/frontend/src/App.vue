<template>
  <div class="grid min-h-screen overflow-hidden" :class="isDesktop ? 'xl:grid-cols-[300px_minmax(0,1fr)]' : ''">
    <!-- Sidebar: visible on desktop only -->
    <aside
      v-if="isDesktop"
      class="border-b border-b-[#3a2e1c]/12 bg-white/84 p-6 backdrop-blur-md xl:sticky xl:top-0 xl:h-screen xl:self-start xl:overflow-y-auto xl:border-b-0 xl:border-r xl:border-r-slate-500/15"
    >
      <div class="flex flex-col gap-4">
        <SearchBar />

        <RouterLink to="/" class="grid gap-3 rounded-3xl border border-slate-400/15 bg-white/70 p-4 transition-colors hover:bg-white/90">
          <div class="flex items-center gap-3">
            <img
              class="h-15 w-15 shrink-0 rounded-2xl object-cover shadow-lg shadow-slate-900/10"
              :src="brandLogo"
              alt="Info Monitor logo"
            />
            <div class="min-w-0">
              <h1 class="m-0 text-[1.25rem] font-semibold text-[#1d1d1d]">Info Monitor</h1>
              <p class="m-0 text-[0.92rem] leading-6 text-ink-body">Workspace-first monitoring OS</p>
            </div>
          </div>
        </RouterLink>

        <section class="grid gap-2.5 rounded-3xl border border-slate-400/15 bg-white/70 p-4">
          <div class="flex items-center justify-between gap-3">
            <strong class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">Workspaces</strong>
          </div>
          <RouterLink
            v-for="workspace in workspaceDefinitions"
            :key="workspace.id"
            :to="`/workspace/${workspace.id}/dashboard`"
            class="rounded-2xl border px-4 py-3 transition-colors"
            :class="workspaceLinkClass(workspace.id)"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="font-semibold">{{ workspace.label }}</span>
              <span class="text-[0.78rem] uppercase tracking-[0.08em] text-ink-secondary">{{ workspace.shortLabel }}</span>
            </div>
            <div class="mt-1.5 text-[0.88rem] leading-6 text-ink-body">
              {{ workspace.summary }}
            </div>
          </RouterLink>
        </section>
      </div>
    </aside>

    <!-- Mobile header -->
    <header
      v-if="!isDesktop"
      class="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-400/15 bg-white/95 px-4 py-3 backdrop-blur-md"
    >
      <RouterLink to="/" class="flex items-center gap-2">
        <img class="h-8 w-8 shrink-0 rounded-lg object-cover" :src="brandLogo" alt="Logo" />
        <span class="text-[0.95rem] font-semibold text-[#1d1d1d]">Info Monitor</span>
      </RouterLink>
      <div class="flex-1">
        <SearchBar />
      </div>
    </header>

    <main class="min-h-0 overflow-y-auto overscroll-contain xl:h-screen" :class="!isDesktop ? 'pb-16' : ''">
      <div v-if="shellState" class="sticky top-0 z-20 border-b border-slate-400/15 bg-[rgba(242,244,247,0.92)] px-4 py-3 backdrop-blur-md md:px-7 md:py-4">
        <div class="grid gap-3 rounded-xl border border-slate-400/15 bg-white/80 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="grid gap-1">
              <div class="text-[0.82rem] uppercase tracking-[0.08em] text-ink-label">Current Workspace</div>
              <div class="text-[0.95rem] font-semibold text-[#1d1d1d] md:text-[1rem]">
                {{ shellState.workspace.label }}
                <span class="ml-2 text-[0.78rem] uppercase tracking-[0.08em] text-ink-secondary md:text-[0.82rem]">{{ shellState.currentSection.label }}</span>
              </div>
              <div class="text-[0.85rem] text-ink-body md:text-[0.9rem]">{{ shellState.currentSection.description }}</div>
            </div>

            <nav class="flex flex-wrap justify-end gap-1.5 md:gap-2.5">
              <RouterLink
                v-for="item in shellState.navItems"
                :key="item.to"
                :to="item.to"
                class="rounded-full px-2.5 py-1.5 text-[0.82rem] font-semibold transition-colors md:px-3.5 md:py-2 md:text-[0.88rem]"
                :class="workspaceSubnavClass(item.to)"
              >
                {{ item.label }}
              </RouterLink>
            </nav>
          </div>
        </div>
      </div>

      <div class="p-4 md:p-6 lg:p-7">
        <RouterView />
      </div>
    </main>

    <!-- Mobile bottom nav -->
    <MobileNav v-if="!isDesktop" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import brandLogo from "./assets/logo-128.png";
import MobileNav from "./components/MobileNav.vue";
import SearchBar from "./components/SearchBar.vue";
import { useBreakpoint } from "./composables/useBreakpoint";
import { useSSE } from "./lib/useSSE";
import { workspaceDefinitions } from "./workspaces/catalog";
import { buildWorkspaceShellState } from "./workspaces/shell";

const route = useRoute();
const { isDesktop } = useBreakpoint();

useSSE((event) => {
  if (event.type === "new_notification") {
    console.info("[SSE] new notification:", event.payload);
  } else if (event.type === "notification_status_changed") {
    console.info("[SSE] notification status changed:", event.payload);
  } else if (event.type === "event_status_changed") {
    console.info("[SSE] event status changed:", event.payload);
  }
});

const shellState = computed(() => buildWorkspaceShellState(
  typeof route.params.workspaceId === "string" ? route.params.workspaceId : null,
  route.path,
));

function workspaceLinkClass(workspaceId: string) {
  return workspaceId === shellState.value?.workspace.id
    ? "border-[#2f2618]/30 bg-[#f5efe2] text-[#2f2618]"
    : "border-slate-400/15 bg-white/70 text-[#53452f] hover:bg-white/92";
}

function workspaceSubnavClass(target: string) {
  return route.path === target || route.path.startsWith(`${target}/`)
    ? "bg-[#143149] text-white"
    : "bg-white/92 text-[#0099ff] hover:bg-white";
}
</script>
