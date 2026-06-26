import { describe, expect, it } from "vitest";
import { flattenSidebar, prevNextForRoute, sidebarForRoute } from "../src/routes-browser.ts";
import type { SiteConfig } from "../src/types.ts";

const config: SiteConfig = {
  title: "Test",
  description: "",
  base: "/",
  hostname: "http://localhost",
  srcDir: ".",
  outDir: "dist",
  head: [],
  themeConfig: {
    nav: [],
    sidebar: {
      "/guide/": [
        { text: "Intro", link: "/guide/intro" },
        {
          text: "Advanced",
          items: [
            { text: "Features", link: "/guide/features" },
            { text: "Config", link: "/guide/config" },
          ],
        },
      ],
      "/api/": [{ text: "Core", link: "/api/core" }],
    },
  },
};

describe("flattenSidebar", () => {
  it("flattens nested items", () => {
    const flat = flattenSidebar(config.themeConfig.sidebar["/guide/"]);
    expect(flat).toEqual([
      { text: "Intro", link: "/guide/intro" },
      { text: "Features", link: "/guide/features" },
      { text: "Config", link: "/guide/config" },
    ]);
  });

  it("skips group items without a link", () => {
    const flat = flattenSidebar([{ text: "Group", items: [] }]);
    expect(flat).toEqual([]);
  });

  it("handles empty array", () => {
    expect(flattenSidebar([])).toEqual([]);
  });
});

describe("sidebarForRoute", () => {
  it("returns sidebar matching the prefix", () => {
    const sidebar = sidebarForRoute("/guide/intro", config);
    expect(sidebar[0].text).toBe("Intro");
  });

  it("returns empty array when no prefix matches", () => {
    expect(sidebarForRoute("/unknown/page", config)).toEqual([]);
  });

  it("picks the longest matching prefix", () => {
    const sidebar = sidebarForRoute("/api/core", config);
    expect(sidebar).toHaveLength(1);
    expect(sidebar[0].link).toBe("/api/core");
  });
});

describe("prevNextForRoute", () => {
  it("returns only next for the first item", () => {
    const { prev, next } = prevNextForRoute("/guide/intro", config);
    expect(prev).toBeUndefined();
    expect(next?.link).toBe("/guide/features");
  });

  it("returns prev and next for a middle item", () => {
    const { prev, next } = prevNextForRoute("/guide/features", config);
    expect(prev?.link).toBe("/guide/intro");
    expect(next?.link).toBe("/guide/config");
  });

  it("returns only prev for the last item", () => {
    const { prev, next } = prevNextForRoute("/guide/config", config);
    expect(prev?.link).toBe("/guide/features");
    expect(next).toBeUndefined();
  });

  it("returns empty object for an unknown route", () => {
    expect(prevNextForRoute("/guide/unknown", config)).toEqual({});
  });
});
