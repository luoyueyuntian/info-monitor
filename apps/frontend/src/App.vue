<template>
  <div class="grid h-screen overflow-hidden md:grid-cols-[260px_minmax(0,1fr)]">
    <aside class="border-b border-b-[#3a2e1c]/12 bg-white/80 p-6 backdrop-blur-md md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto md:border-b-0 md:border-r md:border-r-slate-500/15">
      <div class="flex flex-col items-center gap-3.5 text-center">
        <img
          class="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover shadow-lg shadow-slate-900/10"
          :src="brandLogo"
          alt="Info Monitor logo"
        />
        <div class="min-w-0">
          <h1 class="mb-2 text-[1.6rem] font-semibold text-[#1d1d1d]">Info Monitor</h1>
          <p>Topic-driven monitoring workspace</p>
        </div>
      </div>
      <nav class="mt-7 flex flex-col gap-2">
        <RouterLink
          class="rounded-xl px-3 py-2 text-[#53452f] transition-colors hover:bg-white/60 hover:text-[#3f3424] [&.router-link-active]:bg-[rgba(111,91,58,0.12)] [&.router-link-active]:text-[#3f3424]"
          to="/"
        >
          Inbox
        </RouterLink>
        <RouterLink
          class="rounded-xl px-3 py-2 text-[#53452f] transition-colors hover:bg-white/60 hover:text-[#3f3424] [&.router-link-active]:bg-[rgba(111,91,58,0.12)] [&.router-link-active]:text-[#3f3424]"
          to="/events"
        >
          Events
        </RouterLink>
        <RouterLink
          class="rounded-xl px-3 py-2 text-[#53452f] transition-colors hover:bg-white/60 hover:text-[#3f3424] [&.router-link-active]:bg-[rgba(111,91,58,0.12)] [&.router-link-active]:text-[#3f3424]"
          to="/watchlist"
        >
          Watchlist
        </RouterLink>
        <RouterLink
          class="rounded-xl px-3 py-2 text-[#53452f] transition-colors hover:bg-white/60 hover:text-[#3f3424] [&.router-link-active]:bg-[rgba(111,91,58,0.12)] [&.router-link-active]:text-[#3f3424]"
          to="/themes"
        >
          Themes
        </RouterLink>
        <RouterLink
          class="rounded-xl px-3 py-2 text-[#53452f] transition-colors hover:bg-white/60 hover:text-[#3f3424] [&.router-link-active]:bg-[rgba(111,91,58,0.12)] [&.router-link-active]:text-[#3f3424]"
          to="/sources/status"
        >
          Source Status
        </RouterLink>
      </nav>
    </aside>
    <main class="min-h-0 overflow-y-auto overscroll-contain p-7 md:h-screen">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import brandLogo from "./assets/logo-128.png";
</script>
