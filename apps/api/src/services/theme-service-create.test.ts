import { describe, expect, it } from "vitest";

import { createTheme } from "./theme-service.js";

describe("theme-service createTheme validation (mock mode)", () => {
  it("rejects creating a theme with a source missing adapter-required url config", async () => {
    await expect(
      createTheme({
        name: "Official Announcement API",
        themeType: "news_announcement",
        infoType: "news_announcement",
        sources: [
          {
            name: "Official Announcement API",
            sourceType: "api",
            adapterKey: "generic_news_announcement_list",
            config: {
              title_field: "title",
              category: "exchange_announcement",
            },
          },
        ],
      }),
    ).rejects.toThrow("Missing required field: url");
  });
});
