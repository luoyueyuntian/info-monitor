import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0 };
  },
  routes: [
    { path: "/", name: "workspace-switcher", component: () => import("../views/workspaces/index.vue") },
    { path: "/workspace/:workspaceId", redirect: (to) => `/workspace/${to.params.workspaceId}/dashboard` },
    { path: "/workspace/:workspaceId/dashboard", name: "workspace-dashboard", component: () => import("../views/workspace/[workspaceId]/dashboard/index.vue") },
    { path: "/workspace/:workspaceId/actions", name: "workspace-actions", component: () => import("../views/workspace/[workspaceId]/actions/index.vue") },
    { path: "/workspace/:workspaceId/actions/:eventId", name: "workspace-event-detail", component: () => import("../views/events/[eventId]/index.vue") },
    { path: "/workspace/:workspaceId/topics", name: "workspace-topics", component: () => import("../views/workspace/[workspaceId]/topics/index.vue") },
    { path: "/workspace/:workspaceId/topics/:themeId", name: "workspace-topic-detail", component: () => import("../views/themes/[themeId]/index.vue") },
    { path: "/workspace/:workspaceId/sources", name: "workspace-sources", component: () => import("../views/workspace/[workspaceId]/sources/index.vue") },
    { path: "/workspace/:workspaceId/sources/:sourceId", name: "workspace-source-detail", component: () => import("../views/sources/[sourceId]/index.vue") },
    { path: "/workspace/:workspaceId/reports", name: "workspace-reports", component: () => import("../views/workspace/[workspaceId]/reports/index.vue") },

    // Legacy routes kept for compatibility while the new workspace shell becomes the primary UX.
    { path: "/legacy/inbox", name: "legacy-home", component: () => import("../views/inbox/index.vue") },
    { path: "/events", name: "events", component: () => import("../views/events/index.vue") },
    { path: "/notifications", name: "notifications", component: () => import("../views/notifications/index.vue") },
    { path: "/notifications/audit", name: "notification-audit", component: () => import("../views/notifications/audit.vue") },
    { path: "/notifications/audit/:notificationId", name: "notification-timeline", component: () => import("../views/notifications/audit/[notificationId].vue") },
    { path: "/settings/notifications", name: "notification-preferences", component: () => import("../views/settings/notifications.vue") },
    { path: "/inbox/sections/:sectionId", name: "inbox-section", component: () => import("../views/inbox/sections/[sectionId]/index.vue") },
    { path: "/watchlist", name: "watchlist", component: () => import("../views/watchlist/index.vue") },
    { path: "/themes", name: "themes", component: () => import("../views/themes/index.vue") },
    { path: "/themes/new", name: "theme-new", component: () => import("../views/themes/new/index.vue") },
    { path: "/themes/:themeId", name: "theme-detail", component: () => import("../views/themes/[themeId]/index.vue") },
    { path: "/events/:eventId", name: "event-detail", component: () => import("../views/events/[eventId]/index.vue") },
    { path: "/sources/health", name: "source-health", component: () => import("../views/sources/health.vue") },
    { path: "/sources/status", name: "source-status", component: () => import("../views/sources/status/index.vue") },

    { path: "/sources/:sourceId", name: "source-detail", component: () => import("../views/sources/[sourceId]/index.vue") },
    { path: "/weekly-review", name: "weekly-review", component: () => import("../views/weekly-review/index.vue") },
  ],
});
