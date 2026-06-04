// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ThemeDetailEditThemeFormCard from "./ThemeDetailEditThemeFormCard.vue";

describe("ThemeDetailEditThemeFormCard", () => {
  it("initializes from theme props and emits submitted values", async () => {
    const wrapper = mount(ThemeDetailEditThemeFormCard, {
      props: {
        saving: false,
        statusMessage: "",
        theme: {
          name: "PBOC Theme",
          description: "Track policy updates",
          status: "active",
        },
      },
    });

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("Updated Theme");
    await wrapper.find("textarea").setValue("Updated description");
    await wrapper.find("select").setValue("paused");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("submit")?.[0]?.[0]).toEqual({
      name: "Updated Theme",
      description: "Updated description",
      status: "paused",
    });
  });

  it("resets to latest prop values and reacts to prop changes", async () => {
    const wrapper = mount(ThemeDetailEditThemeFormCard, {
      props: {
        saving: false,
        statusMessage: "",
        theme: {
          name: "Initial Theme",
          description: "Initial description",
          status: "active",
        },
      },
    });

    await wrapper.find("input").setValue("Dirty value");
    await wrapper.find("button.button.secondary").trigger("click");
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("Initial Theme");

    await wrapper.setProps({
      theme: {
        name: "Prop Changed Theme",
        description: "Prop changed description",
        status: "archived",
      },
    });

    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("Prop Changed Theme");
    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toBe("Prop changed description");
    expect((wrapper.find("select").element as HTMLSelectElement).value).toBe("archived");
  });
});
