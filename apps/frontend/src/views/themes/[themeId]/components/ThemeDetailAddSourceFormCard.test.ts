// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import ThemeDetailAddSourceFormCard from "./ThemeDetailAddSourceFormCard.vue";

vi.mock("../../../../lib/api", () => ({
  fetchSourcePresets: vi.fn().mockResolvedValue([
    {
      id: "pbc-news",
      label: "PBOC News Releases",
      description: "Official news from the People's Bank of China.",
      sourceType: "page_list",
      adapterKey: "pbc_news_list",
      infoType: "news_announcement",
      fields: [
        { key: "path", label: "List Path", type: "text", placeholder: "/goutongjiaoliu/113456/113469/index.html", required: true },
        { key: "schedule_interval_seconds", label: "Schedule Interval (s)", type: "number", placeholder: "21600" },
      ],
      defaultConfig: { path: "/goutongjiaoliu/113456/113469/index.html", schedule_interval_seconds: 21600 },
    },
    {
      id: "custom",
      label: "Custom",
      description: "Manual configuration.",
      sourceType: "page_list",
      adapterKey: "",
      infoType: "price",
      fields: [],
      defaultConfig: {},
    },
  ]),
  validateSourceConfig: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
}));

describe("ThemeDetailAddSourceFormCard", () => {
  it("emits form values on submit after selecting a preset", async () => {
    const wrapper = mount(ThemeDetailAddSourceFormCard, {
      props: {
        saving: false,
        statusMessage: "",
      },
    });

    // Wait for presets to load from API
    await nextTick();
    await nextTick();

    // Select a preset (PBOC News)
    const presetButtons = wrapper.findAll("button[type='button']");
    // Find the PBOC News preset button (3rd preset)
    const pbcButton = presetButtons.find((b) => b.text().includes("PBOC News"));
    expect(pbcButton).toBeDefined();
    await pbcButton!.trigger("click");

    // Fill in the source name
    const nameInput = wrapper.find('input[placeholder*="人民银行"] , input[placeholder*="PBOC"]');
    if (nameInput.exists()) {
      await nameInput.setValue("My PBOC Source");
    } else {
      // Try the first text input after preset selection
      const inputs = wrapper.findAll("input[type='text']");
      if (inputs.length > 0) {
        await inputs[0].setValue("My PBOC Source");
      }
    }

    // Set onboarding status to active
    const statusSelect = wrapper.find("select");
    if (statusSelect.exists()) {
      await statusSelect.setValue("active");
    }

    // Submit the form
    await wrapper.find("form").trigger("submit");

    const emitted = wrapper.emitted("submit")?.[0]?.[0] as Record<string, unknown>;
    expect(emitted).toBeDefined();
    expect(emitted.name).toBe("My PBOC Source");
    expect(emitted.sourceType).toBe("page_list");
    expect(emitted.adapterKey).toBe("pbc_news_list");
    expect(emitted.onboardingStatus).toBe("active");
    expect(typeof emitted.config).toBe("object");
  });

  it("resets the form back to defaults", async () => {
    const wrapper = mount(ThemeDetailAddSourceFormCard, {
      props: {
        saving: false,
        statusMessage: "",
      },
    });

    // Wait for presets to load from API
    await nextTick();
    await nextTick();

    // Select a preset first
    const presetButtons = wrapper.findAll("button[type='button']");
    const pbcButton = presetButtons.find((b) => b.text().includes("PBOC News"));
    if (pbcButton) {
      await pbcButton.trigger("click");
    }

    // Fill in a name
    const inputs = wrapper.findAll("input[type='text']");
    if (inputs.length > 0) {
      await inputs[0].setValue("Dirty source");
    }

    // Click reset
    const resetButton = wrapper.find("button[type='button']:has(> span:contains('重置')), button.secondary");
    if (resetButton.exists()) {
      await resetButton.trigger("click");
    }

    // After reset, no preset should be selected (no name input visible)
    const nameInputsAfterReset = wrapper.findAll("input[type='text']");
    // Name input should not be visible since no preset is selected after reset
    expect(nameInputsAfterReset.length).toBe(0);
  });
});
