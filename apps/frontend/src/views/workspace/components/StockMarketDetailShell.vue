<template>
  <section class="page">
    <section class="mb-5 rounded-[24px] border border-slate-400/15 bg-[linear-gradient(135deg,#13263a_0%,#16384a_52%,#1f4f68_100%)] px-5 py-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
      <div class="grid gap-2">
        <div class="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.76rem] font-semibold uppercase tracking-[0.12em] text-white/80">
          股市详情
        </div>
        <div class="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">{{ title }}</div>
        <div class="max-w-[56rem] text-[0.92rem] leading-7 text-white/74">{{ description }}</div>
      </div>
    </section>

    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>
