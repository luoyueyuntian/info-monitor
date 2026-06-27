import { mockEvents, mockNotifications, mockThemes } from "../lib/mock-fixtures.js";

export function fetchAllThemesMock() {
  return mockThemes.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.latestInsight ?? "",
    type: t.type,
  }));
}

export function fetchAllEventsMock() {
  return mockEvents.map((e) => ({
    id: e.id,
    title: e.title,
    signal: e.signal,
    themeId: e.themeId,
    themeName: e.themeName,
    evidence: "evidence" in e ? (e as { evidence: string[] }).evidence : [],
  }));
}

export function fetchAllNotificationsMock() {
  const eventMap = new Map(mockEvents.map((e) => [e.id, e]));
  return mockNotifications.map((n) => {
    const event = eventMap.get(n.eventId);
    return {
      id: n.id,
      title: n.title,
      summary: n.summary,
      signal: n.signal,
      themeId: event?.themeId ?? "",
      themeName: event?.themeName ?? "",
    };
  });
}
