<template>
  <header>
    <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
      <h2 class="m-0 text-[1.8rem] font-semibold text-ink">主题中心</h2>
      <RouterLink
        class="inline-flex items-center justify-center rounded-xl bg-btn-dark px-[18px] py-[11px] text-ink-on-dark shadow-lg shadow-[#2f2618]/12 transition-transform hover:-translate-y-0.5"
        to="/themes/new"
      >
        新增主题
      </RouterLink>
    </div>
    <p class="m-0 leading-7 text-[#675d4f]">管理长期监控主题，快速判断哪些主题最近有信号、哪些主题需要关注。</p>
  </header>
</template>
