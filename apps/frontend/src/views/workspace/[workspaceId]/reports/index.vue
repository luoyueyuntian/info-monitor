<template>
  <section class="page">
    <component :is="boardComponent" />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import { resolveWorkspaceSectionComponent } from "../../../../workspaces/section-resolver";

const route = useRoute();
const boardComponent = computed(() =>
  resolveWorkspaceSectionComponent(
    typeof route.params.workspaceId === "string" ? route.params.workspaceId : null,
    "reports",
  ),
);
</script>
