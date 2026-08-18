// @vitest-environment jsdom
import { ElementNode } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { pageShell } from "../src/layout.ts";
import type { LayoutContext } from "../src/types.ts";

const locales = {
  "/": { label: "English", lang: "en" },
  "/vi/": { label: "Tiếng Việt", lang: "vi" },
};

const baseConfig = {
  title: "Docs",
  description: "test",
  base: "/",
  srcDir: ".",
  outDir: "dist",
  head: [] as string[],
  locales,
  themeConfig: { nav: [], sidebar: {} },
} as LayoutContext["config"];

function ctx(route: string): LayoutContext {
  return {
    config: baseConfig,
    route,
    body: [{ p: "Hello body" }],
    frontmatter: { aside: false },
    title: "Test",
    toc: [],
  } as LayoutContext;
}

function render(app: ReturnType<typeof pageShell>): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return host;
}

function switcher(host: HTMLElement): Element {
  const el = host.querySelector('[aria-label="Select language"]');
  if (!el) throw new Error("locale switcher missing");
  return el;
}

function localeLink(host: HTMLElement, lang: string): HTMLAnchorElement {
  const el = [...host.querySelectorAll("a")].find(
    (anchor) => anchor.getAttribute("lang") === lang,
  );
  if (!el) throw new Error(`locale link for lang=${lang} missing`);
  return el;
}

describe("localeSwitcher prefix matching", () => {
  it("does not treat /video as the /vi locale", () => {
    const host = render(pageShell(ctx("/video")));
    const menu = switcher(host);
    expect(menu.textContent).toContain("English");
    expect(localeLink(host, "en").getAttribute("aria-current")).toBe("true");
    expect(localeLink(host, "vi").getAttribute("aria-current")).toBeNull();
    expect(localeLink(host, "en").getAttribute("href")).toBe("/video");
    expect(localeLink(host, "vi").getAttribute("href")).toBe("/vi/video");
  });

  it("matches /vi and /vi/... on a segment boundary", () => {
    const viHome = render(pageShell(ctx("/vi")));
    expect(localeLink(viHome, "vi").getAttribute("aria-current")).toBe("true");
    expect(localeLink(viHome, "en").getAttribute("href")).toBe("/");
    expect(localeLink(viHome, "vi").getAttribute("href")).toBe("/vi/");

    const viGuide = render(pageShell(ctx("/vi/guide/")));
    expect(localeLink(viGuide, "vi").getAttribute("aria-current")).toBe("true");
    expect(localeLink(viGuide, "en").getAttribute("href")).toBe("/guide/");
    expect(localeLink(viGuide, "vi").getAttribute("href")).toBe("/vi/guide/");
  });
});
