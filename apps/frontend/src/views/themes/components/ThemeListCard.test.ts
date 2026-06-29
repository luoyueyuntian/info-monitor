// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import ThemeListCard from "./ThemeListCard.vue";

const apiMocks = vi.hoisted(() => ({
  fetchThemeFavorites: vi.fn(),
  setThemeFavorite: vi.fn(),
}));

vi.mock("../../../lib/api", () => ({
  fetchThemeFavorites: apiMocks.fetchThemeFavorites,
  setThemeFavorite: apiMocks.setThemeFavorite,
}));

describe("theme list card", () => {
  it("shows an error message and keeps state unchanged when favorite toggle fails", async () => {
    apiMocks.fetchThemeFavorites.mockResolvedValue([]);
    apiMocks.setThemeFavorite.mockRejectedValue(new Error("收藏失败"));

    const wrapper = mount(ThemeListCard, {
      props: {
        themes: [
          {
            id: "theme-1",
            name: "Figma Product Updates",
            type: "content_update",
            status: "active",
            latestRunAt: "2026-06-01T07:30:00Z",
            latestEventAt: "2026-06-01T07:35:00Z",
            sourceCount: 1,
            openEventCount: 1,
            trackingEventCount: 0,
            unreadEventCount: 1,
            bookmarkedEventCount: 0,
            sourceHealth: "healthy",
            latestEventSignal: "content_update",
            latestInsight: "A new product update was detected.",
          },
        ],
        selectedThemeIds: [],
        toggleThemeSelection: vi.fn(),
      },
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template: "<a><slot /></a>",
          },
        },
      },
    });

    await flushPromises();

    const favoriteButton = wrapper.findAll("button").find((button) => button.text().includes("☆"));
    expect(favoriteButton).toBeDefined();

    await favoriteButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("收藏失败");
    expect(wrapper.text()).toContain("☆");
  });
});
