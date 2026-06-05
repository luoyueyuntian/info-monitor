import { countInboxSectionEvents, listBookmarkedEvents, listDashboardEvents } from "./event-service.js";
import { listSourceStatuses } from "./source-service.js";
import { listThemes } from "./theme-service.js";

export async function getDashboardData() {
  const [events, bookmarkedEvents, themes, sources, sectionCounts] = await Promise.all([
    listDashboardEvents(),
    listBookmarkedEvents(),
    listThemes(),
    listSourceStatuses(),
    countInboxSectionEvents(),
  ]);

  const summary = {
    activeThemes: themes.filter((theme) => theme.status === "active").length,
    openEvents: themes.reduce((total, theme) => total + Number(theme.openEventCount ?? 0), 0),
    trackingEvents: themes.reduce((total, theme) => total + Number(theme.trackingEventCount ?? 0), 0),
    unreadEvents: themes.reduce((total, theme) => total + Number(theme.unreadEventCount ?? 0), 0),
    bookmarkedEvents: themes.reduce((total, theme) => total + Number(theme.bookmarkedEventCount ?? 0), 0),
    recentEvents: events.length,
    warningSources: sources.filter((source) => source.status === "warning").length,
    pendingSources: sources.filter((source) => source.latestRunStatus === "pending").length,
  };

  return {
    summary,
    events,
    bookmarkedEvents,
    sectionCounts,
    themes,
    sources,
  };
}
