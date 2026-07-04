// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import type { DomphyElement } from "../src/types.ts";

// StyleList.addCSS splits at-rules into two groups:
//   - Conditional, cascade-overriding at-rules (@media/@container/@supports/
//     @layer) are emitted AFTER the base property block so a same-specificity
//     rule inside the at-rule wins when its condition matches.
//   - Definition at-rules (@keyframes/@font-face) are not cascade overrides;
//     they are emitted as standalone definitions.
// ssr.test.ts already covers @media and @container; this file covers @layer,
// @supports, @keyframes and @font-face.

describe("StyleList.addCSS: conditional at-rule cascade order", () => {
  it("emits @supports AFTER base properties", () => {
    const css = new ElementNode({
      div: "x",
      style: {
        display: "block",
        "@supports (display: grid)": { display: "grid" },
      },
    } as DomphyElement).generateCSS();

    expect(css).toContain("@supports (display: grid)");
    expect(css).toContain("display: grid");
    // Base rule must come first so the at-rule overrides it on match.
    expect(css.indexOf("@supports")).toBeGreaterThan(
      css.indexOf("display: block"),
    );
  });

  it("emits @layer AFTER base properties", () => {
    const css = new ElementNode({
      div: "x",
      style: {
        color: "red",
        "@layer overrides": { color: "green" },
      },
    } as DomphyElement).generateCSS();

    expect(css).toContain("@layer overrides");
    expect(css).toContain("color: green");
    expect(css.indexOf("@layer")).toBeGreaterThan(css.indexOf("color: red"));
  });

  it("emits a @keyframes definition block", () => {
    const css = new ElementNode({
      div: "x",
      style: {
        animationName: "spin",
        "@keyframes spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
    } as DomphyElement).generateCSS();

    expect(css).toContain("@keyframes spin");
    expect(css).toContain("rotate(0deg)");
    expect(css).toContain("rotate(360deg)");
    // Base property still emitted alongside the definition.
    expect(css).toContain("animation-name: spin");
  });

  it("emits a @font-face definition block", () => {
    const css = new ElementNode({
      div: "x",
      style: {
        fontFamily: "MyFont",
        "@font-face": {
          fontFamily: "MyFont",
          src: "url(/my-font.woff2)",
        },
      },
    } as DomphyElement).generateCSS();

    expect(css).toContain("@font-face");
    expect(css).toContain("url(/my-font.woff2)");
    expect(css).toContain("font-family: MyFont");
  });
});

// Regression test for a real bug found while writing @domphy/blocks'
// sidebarStickyHeader interaction checks: StyleProperty's constructor ran
// every style key through camelToKebab() unconditionally, which mangled CSS
// custom-property keys (case-sensitive by spec, never kebab-cased by the
// platform) — e.g. `"--siteHeaderHeight"` became `"--site-header-height"` in
// the emitted CSS, silently breaking every `var(--siteHeaderHeight)`
// reference elsewhere in the same style tree (the property fell back to its
// initial value instead of resolving).
describe("StyleList.addCSS: CSS custom properties", () => {
  it("emits a camelCase custom-property key verbatim, not kebab-cased", () => {
    const css = new ElementNode({
      div: "x",
      style: {
        "--siteHeaderHeight": "calc(4em)",
        height: "calc(100dvh - var(--siteHeaderHeight))",
      },
    } as DomphyElement).generateCSS();

    expect(css).toContain("--siteHeaderHeight: calc(4em)");
    expect(css).not.toContain("--site-header-height");
  });

  it("still kebab-cases ordinary camelCase style properties", () => {
    const css = new ElementNode({
      div: "x",
      style: { backgroundColor: "red" },
    } as DomphyElement).generateCSS();

    expect(css).toContain("background-color: red");
    expect(css).not.toContain("backgroundColor:");
  });
});
