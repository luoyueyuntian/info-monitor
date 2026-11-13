// @vitest-environment jsdom
import { flushPromises, shallowMount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import type { EventSummary } from "../../../lib/api";
import EventWorkbenchBoard from "./EventWorkbenchBoard.vue";

const { fetchEvents, fetchEventPage, fetchFeedbackAggregation } = vi.hoisted(() => ({
  fetchEvents: vi.fn(), fetchEventPage: vi.fn(), fetchFeedbackAggregation: vi.fn(),
}));
vi.mock("../../../lib/api", async (original) => ({ ...await original<typeof import("../../../lib/api")>(), fetchEvents, fetchEventPage, fetchFeedbackAggregation }));

describe("event workbench paging", () => {
  it("renders only a server page while preserving the full diagnostic dataset", async () => {
    const events: EventSummary[] = Array.from({ length: 120 }, (_, n) => ({
      id: `e${n}`, themeId: "t1", themeName: "Theme", title: `Event ${n}`, summary: "summary", signal: "new_announcement",
      status: "open", occurredAt: "2026-01-01T00:00:00Z", infoType: "news_announcement",
    }));
    fetchEvents.mockResolvedValue(events);
    fetchFeedbackAggregation.mockResolvedValue(null);
    fetchEventPage.mockImplementation(async (query) => ({ items: events.slice(query.cursor ? 50 : 0, query.cursor ? 100 : 50), total: 120, nextCursor: query.cursor ? "last" : "next" }));
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/events", component: { template: "<div />" } }] });
    await router.push("/events");
    const wrapper = shallowMount(EventWorkbenchBoard, { global: { plugins: [router] } });
    await flushPromises();
    const list = wrapper.findComponent({ name: "EventWorkbenchListCard" });
    expect(list.props("events")).toHaveLength(50);
    expect(wrapper.findComponent({ name: "EventWorkbenchDiagnosticsCard" }).props("diagnostic").summary).toContain("120");
    wrapper.findComponent({ name: "EventWorkbenchFiltersPanel" }).props("toggleSelectAllVisible")({ target: { checked: true } });
    await flushPromises();
    expect(list.props("selectedEventIds")).toHaveLength(50);
    await wrapper.get('[data-testid="events-next"]').trigger("click");
    await flushPromises();
    expect(wrapper.findComponent({ name: "EventWorkbenchListCard" }).props("events")[0].id).toBe("e50");
    expect(wrapper.findComponent({ name: "EventWorkbenchListCard" }).props("selectedEventIds")).toHaveLength(0);
    wrapper.unmount();
  });
});
