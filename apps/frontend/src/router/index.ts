import { createRouter, createWebHistory } from "vue-router";

import EventDetailView from "../views/events/[eventId]/index.vue";
import EventWorkbenchView from "../views/events/index.vue";
import HomeInboxView from "../views/inbox/index.vue";
import InboxSectionView from "../views/inbox/sections/[sectionId]/index.vue";
import SourceDetailView from "../views/sources/[sourceId]/index.vue";
import SourceStatusView from "../views/sources/status/index.vue";
import WatchlistView from "../views/watchlist/index.vue";
import ThemeDetailView from "../views/themes/[themeId]/index.vue";
import ThemeEditorView from "../views/themes/new/index.vue";
import ThemesView from "../views/themes/index.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeInboxView },
    { path: "/events", name: "events", component: EventWorkbenchView },
    { path: "/inbox/sections/:sectionId", name: "inbox-section", component: InboxSectionView },
    { path: "/watchlist", name: "watchlist", component: WatchlistView },
    { path: "/themes", name: "themes", component: ThemesView },
    { path: "/themes/new", name: "theme-new", component: ThemeEditorView },
    { path: "/themes/:themeId", name: "theme-detail", component: ThemeDetailView },
    { path: "/events/:eventId", name: "event-detail", component: EventDetailView },
    { path: "/sources/status", name: "source-status", component: SourceStatusView },
    { path: "/sources/:sourceId", name: "source-detail", component: SourceDetailView },
  ],
});
