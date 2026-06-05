<template>
  <div class="mb-1.5 flex flex-wrap items-center gap-3">
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" :to="{ path: '/', query: { focus: 'events-price' } }">
      只看价格信号
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" :to="{ path: '/', query: { focus: 'events-content' } }">
      只看内容更新
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" :to="{ path: '/', query: { focus: 'events-official' } }">
      只看官方发布
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" :to="{ path: '/', query: { focus: 'events-financial' } }">
      只看金融事件
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" :to="{ path: '/', query: { focus: 'events-all', recent: '24h' } }">
      最近24小时事件
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" :to="{ path: '/', query: { status: 'open' } }">
      只看待处理
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" :to="{ path: '/', query: { status: 'tracking' } }">
      只看关注中
    </RouterLink>
    <RouterLink class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]" :to="{ path: '/', query: { status: 'ignored' } }">
      只看已忽略
    </RouterLink>
    <RouterLink
      class="inline-flex items-center justify-center rounded-xl bg-[#e6dcc8] px-4 py-2.5 text-[#3a3126] transition-colors hover:bg-[#ddd1bb]"
      :to="{ path: '/', query: { focus: undefined, status: undefined, recent: undefined } }"
      replace
    >
      取消聚焦
    </RouterLink>
  </div>
</template>
