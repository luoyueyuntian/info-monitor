// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventFeedbackInline from "./EventFeedbackInline.vue";

const { fetchEventFeedback } = vi.hoisted(() => ({ fetchEventFeedback: vi.fn() }));
vi.mock("../lib/api", () => ({ fetchEventFeedback, upsertEventFeedback: vi.fn(), deleteEventFeedback: vi.fn() }));
beforeEach(() => { fetchEventFeedback.mockReset(); });

describe("inline feedback preloading", () => {
  it("does not request feedback already included in a page", async () => {
    const wrapper = mount(EventFeedbackInline, { props: { eventId: "e1", initialFeedback: null } });
    await flushPromises();
    expect(fetchEventFeedback).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it("still loads feedback for legacy callers without a preload", async () => {
    fetchEventFeedback.mockResolvedValue({ feedback: "useful" });
    const wrapper = mount(EventFeedbackInline, { props: { eventId: "e1" } });
    await flushPromises();
    expect(fetchEventFeedback).toHaveBeenCalledWith("e1");
    wrapper.unmount();
  });
});
