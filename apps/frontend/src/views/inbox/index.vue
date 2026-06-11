<template>
  <section class="flex flex-col gap-5">
    <HomeInboxHeader />
    <WorkflowPanel
      :unread-count="unreadCount"
      :open-event-count="openEventCount"
      :stats="workflowStats"
      @batch-read="handleBatchRead"
      @mark-all-read="handleMarkAllRead"
      @clear-read="handleClearRead"
      @resolve-all="handleResolveAll"
    />
    <HomeInboxBoard />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import HomeInboxBoard from "./components/HomeInboxBoard.vue";
import HomeInboxHeader from "./components/HomeInboxHeader.vue";
import WorkflowPanel from "./components/WorkflowPanel.vue";
import { fetchDashboard, fetchNotifications, batchMarkNotificationsRead, batchDeleteNotifications } from "../../lib/api";

const unreadCount = ref(0);
const openEventCount = ref(0);
const workflowStats = ref({
  readToday: 0,
  trackedToday: 0,
  archivedToday: 0,
});

async function loadWorkflowData() {
  try {
    const [dashboard, notifications] = await Promise.all([
      fetchDashboard(),
      fetchNotifications({ status: "pending", limit: 100 }),
    ]);

    unreadCount.value = notifications.total;
    openEventCount.value = dashboard.summary.openEvents;
    workflowStats.value = {
      readToday: dashboard.summary.recentEvents,
      trackedToday: dashboard.summary.trackingEvents,
      archivedToday: 0,
    };
  } catch (error) {
    console.error("Failed to load workflow data:", error);
  }
}

async function handleBatchRead() {
  try {
    const notifications = await fetchNotifications({ status: "pending", limit: 50 });
    const ids = notifications.items.map((n) => n.id);
    if (ids.length > 0) {
      await batchMarkNotificationsRead(ids);
      await loadWorkflowData();
    }
  } catch (error) {
    console.error("Failed to batch read:", error);
  }
}

async function handleMarkAllRead() {
  try {
    const notifications = await fetchNotifications({ status: "pending", limit: 1000 });
    const ids = notifications.items.map((n) => n.id);
    if (ids.length > 0) {
      await batchMarkNotificationsRead(ids);
      await loadWorkflowData();
    }
  } catch (error) {
    console.error("Failed to mark all read:", error);
  }
}

async function handleClearRead() {
  try {
    await batchDeleteNotifications({ status: "sent" });
    await loadWorkflowData();
  } catch (error) {
    console.error("Failed to clear read:", error);
  }
}

async function handleResolveAll() {
  // This would batch update event status to "resolved"
  console.log("Resolve all events");
}

onMounted(() => void loadWorkflowData());
</script>
