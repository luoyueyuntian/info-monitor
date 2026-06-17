<template>
  <section class="page">
    <StockMarketReportsBoard v-if="isStockMarket" />
    <WorkspaceReportsBoard v-else />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import StockMarketReportsBoard from "./components/StockMarketReportsBoard.vue";
import WorkspaceReportsBoard from "./components/WorkspaceReportsBoard.vue";

const route = useRoute();
const isStockMarket = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
</script>
