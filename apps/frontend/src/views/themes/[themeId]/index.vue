<template>
  <StockMarketDetailShell
    v-if="isStockMarket"
    title="股市主题详情"
    description="围绕市场总览、公告线索和异动调查继续下钻，保持在股市板块内完成复盘与判断。"
  >
    <ThemeDetailBoard />
  </StockMarketDetailShell>
  <section v-else class="page">
    <ThemeDetailBoard />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import StockMarketDetailShell from "../../workspace/components/StockMarketDetailShell.vue";
import ThemeDetailBoard from "./components/ThemeDetailBoard.vue";

const route = useRoute();
const isStockMarket = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
</script>
