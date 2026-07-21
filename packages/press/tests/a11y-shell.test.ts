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

  it("pressCSS emits skip-link + prefers-reduced-motion rules", async () => {
    const { pressCSS } = await import("../src/theme.js");
    const css = pressCSS();
    expect(css).toContain(".dp-skip-link");
    expect(css).toContain("prefers-reduced-motion");
  });
});
