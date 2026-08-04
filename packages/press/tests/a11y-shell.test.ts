// @vitest-environment jsdom
/**
 * Front-End Checklist structural guarantees for press shells:
 * skip-to-content, main landmark id, lang/viewport are emitted by the HTML
 * document builder (covered elsewhere) — here we verify the Domphy tree.
 */

import { ElementNode } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { homeShell, pageShell } from "../src/layout.js";
import type { LayoutContext } from "../src/types.js";

const baseConfig = {
  title: "Domphy",
  description: "test",
  base: "/",
  srcDir: ".",
  outDir: "dist",
  head: [] as string[],
  themeConfig: {
    nav: [],
    sidebar: {},
  },
} as any;

function ctx(partial: Partial<LayoutContext> = {}): LayoutContext {
  return {
    config: baseConfig,
    route: "/docs/test",
    body: [{ p: "Hello body" }],
    frontmatter: { aside: false },
    title: "Test",
    description: "desc",
    headers: [],
    toc: [],
    ...partial,
  } as LayoutContext;
}

function render(app: any) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return host;
}

describe("press shell a11y (Front-End Checklist)", () => {
  it("pageShell includes skip link and #main-content landmark", () => {
    const host = render(pageShell(ctx()));
    const skip = host.querySelector("a.dp-skip-link, a[href='#main-content']");
    expect(skip).not.toBeNull();
    expect(skip!.getAttribute("href")).toBe("#main-content");
    const main = host.querySelector("#main-content");
    expect(main).not.toBeNull();
    expect(main!.tagName.toLowerCase()).toBe("main");
  });

  it("homeShell includes skip link and #main-content landmark", () => {
    const host = render(
      homeShell(
        ctx({
          route: "/",
          frontmatter: {
            layout: "home",
            hero: { name: "Domphy", text: "UI", tagline: "plain objects" },
          },
        }),
      ),
    );
    expect(host.querySelector("a[href='#main-content']")).not.toBeNull();
    const main = host.querySelector("main");
    expect(main).not.toBeNull();
    expect(main!.id || main!.getAttribute("id")).toBe("main-content");
  });

  it("pageShell TOC nav is marked dp-toc for scroll-spy runtime", () => {
    const host = render(
      pageShell(
        ctx({
          frontmatter: {},
          toc: [
            { level: 1, text: "Title", slug: "title" },
            { level: 2, text: "Section", slug: "section" },
            { level: 3, text: "Sub", slug: "sub" },
          ],
        }),
      ),
    );
    const toc = host.querySelector("nav.dp-toc");
    expect(toc).not.toBeNull();
    expect(toc!.getAttribute("aria-label")).toBeTruthy();
    const link = toc!.querySelector('a[href="#section"]');
    expect(link).not.toBeNull();
  });

  it("pressCSS emits skip-link + prefers-reduced-motion rules", async () => {
    const { pressCSS } = await import("../src/theme.js");
    const css = pressCSS();
    expect(css).toContain(".dp-skip-link");
    expect(css).toContain("prefers-reduced-motion");
  });
});

describe("pageShell aside:false keeps sidebar and expands content", () => {
  const configWithSidebar = {
    ...baseConfig,
    themeConfig: {
      nav: [],
      sidebar: {
        "/docs/": [
          {
            text: "Guide",
            items: [{ text: "Test", link: "/docs/test" }],
          },
        ],
      },
    },
  } as any;

  function shellGrid(partial: Partial<LayoutContext> = {}) {
    const shell = pageShell(
      ctx({
        config: configWithSidebar,
        ...partial,
      }),
    );
    const shellChildren = (shell as any).div as any[];
    return shellChildren.find((child: any) => child?.style?.display === "grid");
  }

  it("hides TOC aside but still renders the docs sidebar column", () => {
    const grid = shellGrid({
      frontmatter: { aside: false },
      toc: [
        { level: 1, text: "Title", slug: "title" },
        { level: 2, text: "Section", slug: "section" },
      ],
    });
    expect(grid).toBeTruthy();
    const children = grid.div as any[];
    // Sidebar nav (Documentation) + main — no TOC <aside>.
    const sidebarNav = children.find(
      (child: any) => child?.ariaLabel === "Documentation",
    );
    const mainEl = children.find((child: any) => child?.id === "main-content");
    const tocAside = children.find((child: any) => child?.aside !== undefined);
    expect(sidebarNav).toBeTruthy();
    expect(mainEl).toBeTruthy();
    expect(tocAside).toBeUndefined();
    // Two-column grid: sidebar + main (no aside width token).
    expect(String(grid.style.gridTemplateColumns)).toMatch(
      /minmax\(0,\s*1fr\)\s*$/,
    );
  });

  it("does not cap prose max-width when aside is hidden and sidebar is shown", () => {
    const grid = shellGrid({
      frontmatter: { aside: false },
      toc: [{ level: 2, text: "Section", slug: "section" }],
    });
    expect(grid).toBeTruthy();
    const mainEl = (grid.div as any[]).find(
      (child: any) => child?.id === "main-content",
    );
    expect(mainEl).toBeTruthy();
    const contentDiv = (mainEl.main as any[]).find(
      (child: any) => child?.div && child?.style?.maxWidth !== undefined,
    );
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.style.maxWidth).toBe("none");
  });

  it("never emits a bare 1fr content track (mobile grid blowout)", () => {
    // A bare `1fr` is `minmax(auto,1fr)`: the track floors at the item's
    // min-content width, so a page with a wide unbreakable subtree (the
    // playground's CodeMirror scroller) overflows the viewport horizontally
    // on ≤860px. Found by visual:responsive playground @ mobile-375.
    for (const partial of [
      {}, // sidebar page
      { config: baseConfig }, // no-sidebar page
    ]) {
      const grid = shellGrid(partial);
      expect(grid).toBeTruthy();
      expect(String(grid.style.gridTemplateColumns)).not.toBe("1fr");
      const mobile = grid.style["@media (max-width: 860px)"];
      expect(String(mobile.gridTemplateColumns)).toMatch(/minmax\(0,\s*1fr\)/);
    }
  });
});
