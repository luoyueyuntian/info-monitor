import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("../views/inbox/index.vue") },
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
  ],
});
