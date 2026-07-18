// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { panelSection, row, stack, toolbar } from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** Extracts the numeric em value out of a `themeSpacing()` result like `calc(0.75em)`. */
function gapEm(css: string): number {
  const match = css.match(/gap: calc\(([\d.]+)em\)/);
  return match ? Number.parseFloat(match[1]) : Number.NaN;
}

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// stack
// ---------------------------------------------------------------------------

describe("stack", () => {
  it("lays out the host as a flex column", () => {
    const node = new ElementNode({
      div: [{ p: "A" }, { p: "B" }],
      $: [stack()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("display: flex");
    expect(css).toContain("flex-direction: column");
  });

  it("default gap (3) produces a smaller gap than a doubled multiplier", () => {
    const { node: defaultNode } = render({ div: null, $: [stack()] } as DomphyElement);
    const defaultGap = gapEm(defaultNode.generateCSS());
    document.body.innerHTML = "";

    const { node: doubledNode } = render({
      div: null,
      $: [stack({ gap: 6 })],
    } as DomphyElement);
    const doubledGap = gapEm(doubledNode.generateCSS());

    expect(defaultGap).toBeLessThan(doubledGap);
  });

  it("does not set alignItems unless align is provided", () => {
    const node = new ElementNode({ div: null, $: [stack()] } as DomphyElement);
    expect(node.generateCSS()).not.toContain("align-items");
  });

  it("align prop sets alignItems", () => {
    const node = new ElementNode({
      div: null,
      $: [stack({ align: "center" })],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("align-items: center");
  });

  it("host style overrides the patch's gap (native wins)", () => {
    const node = new ElementNode({
      div: null,
      $: [stack()],
      style: { gap: "99px" },
    } as DomphyElement);
    expect(node.generateCSS()).toContain("gap: 99px");
  });
});

// ---------------------------------------------------------------------------
// row
// ---------------------------------------------------------------------------

describe("row", () => {
  it("lays out the host as a centered flex row by default", () => {
    const node = new ElementNode({
      div: [{ span: "Icon" }, { span: "Label" }],
      $: [row()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("display: flex");
    expect(css).toContain("align-items: center");
  });

  it("justify prop sets justifyContent", () => {
    const node = new ElementNode({
      div: null,
      $: [row({ justify: "space-between" })],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("justify-content: space-between");
  });

  it("omits justifyContent when justify is not provided", () => {
    const node = new ElementNode({ div: null, $: [row()] } as DomphyElement);
    expect(node.generateCSS()).not.toContain("justify-content");
  });

  it("wrap prop sets flexWrap", () => {
    const node = new ElementNode({
      div: null,
      $: [row({ wrap: true })],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("flex-wrap: wrap");
  });

  it("align prop overrides the center default", () => {
    const node = new ElementNode({
      div: null,
      $: [row({ align: "flex-start" })],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("align-items: flex-start");
  });

  it("gap prop math: default (4) is larger than a smaller custom value", () => {
    const { node: defaultNode } = render({ div: null, $: [row()] } as DomphyElement);
    const defaultGap = gapEm(defaultNode.generateCSS());
    document.body.innerHTML = "";

    const { node: customNode } = render({
      div: null,
      $: [row({ gap: 2 })],
    } as DomphyElement);
    const customGap = gapEm(customNode.generateCSS());

    expect(customGap).toBeLessThan(defaultGap);
  });
});

// ---------------------------------------------------------------------------
// toolbar (delegates to row — assert the shape survives the refactor)
// ---------------------------------------------------------------------------

describe("toolbar delegating to row", () => {
  it("still lays out as a centered flex row with the default gap", () => {
    const node = new ElementNode({
      header: [{ span: "Logo" }],
      $: [toolbar()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("display: flex");
    expect(css).toContain("align-items: center");
  });

  it("a custom gap still applies", () => {
    const { node: defaultNode } = render({
      header: null,
      $: [toolbar()],
    } as DomphyElement);
    const defaultGap = gapEm(defaultNode.generateCSS());
    document.body.innerHTML = "";

    const { node: customNode } = render({
      header: null,
      $: [toolbar({ gap: 2 })],
    } as DomphyElement);
    const customGap = gapEm(customNode.generateCSS());

    expect(customGap).toBeLessThan(defaultGap);
  });
});

// ---------------------------------------------------------------------------
// panelSection
// ---------------------------------------------------------------------------

describe("panelSection", () => {
  it("applies padding on all sides", () => {
    const node = new ElementNode({
      div: [{ h3: "Title" }],
      $: [panelSection()],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("padding:");
  });

  it("does not set a border by default", () => {
    const node = new ElementNode({
      div: null,
      $: [panelSection()],
    } as DomphyElement);
    expect(node.generateCSS()).not.toContain("border-bottom");
  });

  it("divider:true adds a bottom border", () => {
    const node = new ElementNode({
      div: null,
      $: [panelSection({ divider: true })],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("border-bottom:");
  });

  it("does not impose display:flex (thin wrapper — composes with stack/row)", () => {
    const node = new ElementNode({
      div: null,
      $: [panelSection()],
    } as DomphyElement);
    expect(node.generateCSS()).not.toContain("display: flex");
  });

  it("composes with stack() for internal layout", () => {
    const node = new ElementNode({
      div: [{ p: "A" }, { p: "B" }],
      $: [panelSection(), stack({ gap: 2 })],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("display: flex");
    expect(css).toContain("padding:");
  });

  it("host style overrides the patch's padding (native wins)", () => {
    const node = new ElementNode({
      div: null,
      $: [panelSection()],
      style: { padding: "1px" },
    } as DomphyElement);
    expect(node.generateCSS()).toContain("padding: 1px");
  });
});
