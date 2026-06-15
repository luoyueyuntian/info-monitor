<template>
  <StockMarketDetailShell
    v-if="isStockMarket"
    title="股市事件详情"
    description="从股市盘后报告进入事件详情后，继续在板块内查看事件解释、证据和后续动作。"
  >
    <EventDetailBoard />
  </StockMarketDetailShell>
  <section v-else class="page">
    <EventDetailBoard />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import StockMarketDetailShell from "../../workspace/components/StockMarketDetailShell.vue";
import EventDetailBoard from "./components/EventDetailBoard.vue";

const route = useRoute();
const isStockMarket = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
</script>
