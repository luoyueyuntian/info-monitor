<template>
  <section class="page">
    <StockMarketActionsBoard v-if="isStockMarket" />
    <WorkspaceActionsBoard v-else />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import StockMarketActionsBoard from "./components/StockMarketActionsBoard.vue";
import WorkspaceActionsBoard from "./components/WorkspaceActionsBoard.vue";

const route = useRoute();
const isStockMarket = computed(() => String(route.params.workspaceId ?? "") === "stock-market");
</script>
