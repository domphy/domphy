// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  splitter,
  splitterHandle,
  splitterPanel,
  toolbar,
  toolbarSpacer,
} from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// toolbar
// ---------------------------------------------------------------------------

describe("toolbar", () => {
  it("lays out the host as a centered flex row", () => {
    const node = new ElementNode({
      header: [{ span: "Logo" }],
      $: [toolbar()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("display: flex");
    expect(css).toContain("align-items: center");
  });

  it("renders its children", () => {
    const { host } = render({
      header: [{ span: "Logo" }, { nav: [{ a: "Home", href: "#" }] }],
      $: [toolbar()],
    } as DomphyElement);
    expect(host.textContent).toContain("Logo");
    expect(host.textContent).toContain("Home");
  });

  it("accepts a custom gap without throwing", () => {
    expect(() =>
      render({
        header: [{ span: "x" }],
        $: [toolbar({ gap: 3 })],
      } as DomphyElement),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// toolbarSpacer
// ---------------------------------------------------------------------------

describe("toolbarSpacer", () => {
  it("is a div element that flexes to fill space", () => {
    const spacer = toolbarSpacer();
    expect(spacer).toHaveProperty("div");
    const node = new ElementNode(spacer as DomphyElement);
    expect(node.generateCSS()).toContain("flex: 1 1 0");
  });

  it("renders as a div in the DOM", () => {
    const { host } = render({
      header: [{ span: "L" }, toolbarSpacer(), { span: "R" }],
      $: [toolbar()],
    } as DomphyElement);
    // header > span, div(spacer), span
    expect(host.querySelector("header > div")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// splitter grip (::after width/height bug fix)
// ---------------------------------------------------------------------------

describe("splitter handle grip", () => {
  it("renders a visible ::after grip with non-zero width and height", () => {
    const node = new ElementNode({
      div: [
        { div: "Left", $: [splitterPanel()] },
        { div: null, $: [splitterHandle()] },
        { div: "Right" },
      ],
      $: [splitter()],
    } as DomphyElement);

    const css = node.generateCSS();
    // The grip is drawn via "&::after". Before the fix it had no size and
    // rendered 0x0 (invisible). Assert the ::after block now declares both
    // width and height.
    const afterBlock = css.slice(css.indexOf("::after"));
    expect(afterBlock).toContain("width:");
    expect(afterBlock).toContain("height:");
    // The grip must not be zero-sized.
    expect(afterBlock).not.toMatch(/width:\s*0(px)?\s*;/);
    expect(afterBlock).not.toMatch(/height:\s*0(px)?\s*;/);
  });
});
