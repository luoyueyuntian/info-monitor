<template>
  <div class="relative">
    <div class="flex items-center gap-2 rounded-2xl border border-slate-400/15 bg-white/70 px-3.5 py-2.5 transition-colors focus-within:border-[#6b4f1f]/30 focus-within:bg-white">
      <svg class="h-4 w-4 shrink-0 text-ink-muted" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
      </svg>
      <input
        v-model="query"
        type="text"
        placeholder="搜索事件、通知、主题..."
        class="flex-1 bg-transparent text-[0.88rem] text-ink outline-none placeholder:text-ink-muted"
        @keydown.enter="goToSearch"
      />
      <kbd
        v-if="!query"
        class="hidden rounded-md border border-slate-400/20 bg-slate-100/80 px-1.5 py-0.5 text-[0.7rem] text-ink-muted sm:inline"
      >
        /
      </kbd>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const query = ref("");

function goToSearch() {
  if (query.value.trim()) {
    router.push({ path: "/search", query: { q: query.value.trim() } });
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
    e.preventDefault();
    const input = document.querySelector<HTMLInputElement>(".relative input");
    input?.focus();
  }
}

onMounted(() => document.addEventListener("keydown", handleKeyDown));
onBeforeUnmount(() => document.removeEventListener("keydown", handleKeyDown));
</script>
