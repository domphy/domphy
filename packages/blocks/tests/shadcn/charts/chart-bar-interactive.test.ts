// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartBarInteractive } from "../../../src/shadcn/charts/chart-bar-interactive.ts";

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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

describe("chartBarInteractive", () => {
  it("renders a working demo tree with zero args: header title/subtitle, two stat tiles, chart plot, no footer", () => {
    const { host } = render(chartBarInteractive() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Bar Chart - Interactive",
    );
    expect(host.querySelectorAll("aside button")).toHaveLength(2);
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")).toBeFalsy();
  });

  it("clicking a stat tile marks it active and clears the other", () => {
    const { host } = render(chartBarInteractive() as DomphyElement);
    const [desktopTile, mobileTile] = Array.from(
      host.querySelectorAll("aside button"),
    );
    expect(desktopTile.getAttribute("data-active")).toBe("true");
    expect(mobileTile.getAttribute("data-active")).toBe("false");

    mobileTile.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    flushSync();

    expect(mobileTile.getAttribute("data-active")).toBe("true");
    expect(desktopTile.getAttribute("data-active")).toBe("false");
  });
});
