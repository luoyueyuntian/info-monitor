<template>
  <StockMarketDetailShell
    v-if="isStockMarket"
    title="股市来源详情"
    description="继续在股市板块内查看来源状态、抓取质量和对应的调查线索，不跳出当前工作流。"
  >
    <SourceDetailBoard />
  </StockMarketDetailShell>
  <section v-else class="page">
    <SourceDetailBoard />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import StockMarketDetailShell from "../../workspace/components/StockMarketDetailShell.vue";
import SourceDetailBoard from "./components/SourceDetailBoard.vue";

const route = useRoute();
const isStockMarket = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
</script>
