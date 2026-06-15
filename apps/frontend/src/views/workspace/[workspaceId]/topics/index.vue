<template>
  <section class="page">
    <StockMarketTopicsBoard v-if="isStockMarket" />
    <WorkspaceTopicsBoard v-else />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import StockMarketTopicsBoard from "./components/StockMarketTopicsBoard.vue";
import WorkspaceTopicsBoard from "./components/WorkspaceTopicsBoard.vue";

const route = useRoute();
const isStockMarket = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
</script>
