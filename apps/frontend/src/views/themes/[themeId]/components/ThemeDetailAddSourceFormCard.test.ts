// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ThemeDetailAddSourceFormCard from "./ThemeDetailAddSourceFormCard.vue";

describe("ThemeDetailAddSourceFormCard", () => {
  it("emits current form values on submit", async () => {
    const wrapper = mount(ThemeDetailAddSourceFormCard, {
      props: {
        saving: false,
        statusMessage: "",
      },
    });

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("PBOC News");
    await wrapper.findAll("select")[0].setValue("api");
    await inputs[1].setValue("pbc_news_list");
    await wrapper.find("textarea").setValue('{"path":"/news"}');
    await inputs[2].setValue(false);
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("submit")?.[0]?.[0]).toEqual({
      name: "PBOC News",
      sourceType: "api",
      adapterKey: "pbc_news_list",
      configJson: '{"path":"/news"}',
      runImmediately: false,
    });
  });

  it("resets the form back to defaults", async () => {
    const wrapper = mount(ThemeDetailAddSourceFormCard, {
      props: {
        saving: false,
        statusMessage: "",
      },
    });

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("Dirty source");
    await wrapper.findAll("select")[0].setValue("rss");
    await wrapper.find("textarea").setValue('{"dirty":true}');
    await inputs[2].setValue(false);

    await wrapper.find("button.button.secondary").trigger("click");

    expect((wrapper.findAll("input")[0].element as HTMLInputElement).value).toBe("");
    expect((wrapper.findAll("select")[0].element as HTMLSelectElement).value).toBe("page_list");
    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toBe("{}");
    expect((wrapper.findAll("input")[2].element as HTMLInputElement).checked).toBe(true);
  });
});
