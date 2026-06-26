import { describe, expect, it } from "vitest";
import { config } from "../press.config.js";
import {
  flattenSidebar,
  outFileForRoute,
  prevNextForRoute,
  routeForFile,
  sidebarForRoute,
} from "@domphy/press";
import type { SiteConfig } from "@domphy/press";

describe("routeForFile", () => {
  it("maps the root landing page to /", () => {
    expect(routeForFile("index.md")).toBe("/");
  });

  it("maps a section index.md to a trailing-slash route", () => {
    expect(routeForFile("docs/core/index.md")).toBe("/docs/core/");
  });

  it("maps a leaf page to an extensionless route", () => {
    expect(routeForFile("docs/ui/patches/button.md")).toBe(
      "/docs/ui/patches/button",
    );
  });

  it("normalizes Windows separators", () => {
    expect(routeForFile("docs\\ui\\index.md")).toBe("/docs/ui/");
  });
});

describe("outFileForRoute", () => {
  it("maps / to index.html", () => {
    expect(outFileForRoute("/")).toBe("index.html");
  });

  it("maps a trailing-slash route to a directory index", () => {
    expect(outFileForRoute("/docs/core/")).toBe("docs/core/index.html");
  });

  it("maps a leaf route to a clean-URL directory index", () => {
    expect(outFileForRoute("/docs/ui/patches/button")).toBe(
      "docs/ui/patches/button/index.html",
    );
  });
});

describe("flattenSidebar", () => {
  it("returns leaf links in document order, descending into groups", () => {
    const flat = flattenSidebar([
      { text: "A", link: "/a" },
      {
        text: "Group",
        items: [
          { text: "B", link: "/b" },
          { text: "C", link: "/c" },
        ],
      },
      { text: "D", link: "/d" },
    ]);
    expect(flat.map((item) => item.link)).toEqual(["/a", "/b", "/c", "/d"]);
  });

  it("skips group headers that have no link", () => {
    const flat = flattenSidebar([
      { text: "Header", items: [{ text: "X", link: "/x" }] },
    ]);
    expect(flat).toEqual([{ text: "X", link: "/x" }]);
  });
});

function makeSiteConfig(sidebar: Record<string, unknown[]>): SiteConfig {
  return { title: "t", description: "d", base: "/", hostname: "http://localhost", srcDir: ".", outDir: "dist", head: [], themeConfig: { nav: [], sidebar } } as unknown as SiteConfig
}

describe("sidebarForRoute", () => {
  const sample = makeSiteConfig({
    "/docs/core/": [{ text: "Core", link: "/docs/core/" }],
    "/docs/ui/": [{ text: "UI", link: "/docs/ui/" }],
  })

  it("selects the sidebar whose prefix matches the route", () => {
    expect(sidebarForRoute("/docs/ui/patches/button", sample)[0].text).toBe("UI")
  });

  it("prefers the longest matching prefix", () => {
    const nested = makeSiteConfig({
      "/docs/": [{ text: "Docs", link: "/docs/" }],
      "/docs/ui/": [{ text: "UI", link: "/docs/ui/" }],
    })
    expect(sidebarForRoute("/docs/ui/patches/button", nested)[0].text).toBe("UI")
  });

  it("returns an empty group for an unmatched route", () => {
    expect(sidebarForRoute("/nope", sample)).toEqual([])
  });
});

describe("prevNextForRoute", () => {
  const sample = makeSiteConfig({
    "/docs/x/": [
      { text: "One", link: "/docs/x/one" },
      { text: "Two", link: "/docs/x/two" },
      { text: "Three", link: "/docs/x/three" },
    ],
  });

  it("resolves prev and next neighbours", () => {
    const { prev, next } = prevNextForRoute("/docs/x/two", sample);
    expect(prev?.link).toBe("/docs/x/one");
    expect(next?.link).toBe("/docs/x/three");
  });

  it("has no prev at the first page and no next at the last", () => {
    expect(prevNextForRoute("/docs/x/one", sample).prev).toBeUndefined();
    expect(prevNextForRoute("/docs/x/three", sample).next).toBeUndefined();
  });

  it("tolerates a trailing-slash difference when matching the active route", () => {
    const { next } = prevNextForRoute("/docs/x/one/", sample);
    expect(next?.link).toBe("/docs/x/two");
  });
});

// Regression guard for the live site config: the UI patches sidebar must list
// real patches only. `typography` is a concept page that must stay reachable,
// and the removed `form` patch must not reappear in the sidebar.
describe("live site config (UI patches sidebar)", () => {
  const uiPatches = config.themeConfig.sidebar["/docs/ui/"] ?? [];
  const links = new Set(flattenSidebar(uiPatches).map((item) => item.link));

  it("includes the typography concept page", () => {
    expect(links.has("/docs/ui/patches/typography")).toBe(true);
  });

  it("does not list the removed form patch", () => {
    expect(links.has("/docs/ui/patches/form")).toBe(false);
  });
});
