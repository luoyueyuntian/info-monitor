<template>
  <div class="toolbar section-toolbar">
    <RouterLink class="button secondary" :to="{ path: '/', query: { focus: 'events-price' } }">
      只看价格信号
    </RouterLink>
    <RouterLink class="button secondary" :to="{ path: '/', query: { focus: 'events-official' } }">
      只看官方发布
    </RouterLink>
    <RouterLink class="button secondary" :to="{ path: '/', query: { focus: 'events-financial' } }">
      只看金融事件
    </RouterLink>
    <RouterLink class="button secondary" :to="{ path: '/', query: { focus: 'events-all', recent: '24h' } }">
      最近24小时事件
    </RouterLink>
    <RouterLink class="button secondary" :to="{ path: '/', query: { status: 'open' } }">
      只看待处理
    </RouterLink>
    <RouterLink class="button secondary" :to="{ path: '/', query: { status: 'tracking' } }">
      只看关注中
    </RouterLink>
    <RouterLink class="button secondary" :to="{ path: '/', query: { status: 'ignored' } }">
      只看已忽略
    </RouterLink>
    <RouterLink
      class="button secondary"
      :to="{ path: '/', query: { focus: undefined, status: undefined, recent: undefined } }"
      replace
    >
      取消聚焦
    </RouterLink>
  </div>
</template>
