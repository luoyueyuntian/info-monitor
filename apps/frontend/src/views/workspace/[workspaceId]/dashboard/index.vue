<template>
  <section class="page">
    <StockMarketDashboardBoard v-if="isStockMarket" />
    <WorkspaceDashboardBoard v-else />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import StockMarketDashboardBoard from "./components/StockMarketDashboardBoard.vue";
import WorkspaceDashboardBoard from "./components/WorkspaceDashboardBoard.vue";

const route = useRoute();
const isStockMarket = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
</script>
