// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chartLineInteractive } from "../../../src/shadcn/charts/chart-line-interactive.ts";

vi.setConfig({ testTimeout: 20000 });

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

describe("chartLineInteractive", () => {
  it("renders a working demo tree with zero args: header title/description, two stat tiles, chart plot, no footer", () => {
    const { host } = render(chartLineInteractive() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Line Chart - Interactive",
    );
    expect(host.querySelectorAll("aside button")).toHaveLength(2);
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")).toBeFalsy();
  });

  it("clicking a stat tile marks it active and clears the other", () => {
    const { host } = render(chartLineInteractive() as DomphyElement);
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

  it("replays the series-change reveal after an ancestor re-render reuses the plot", () => {
    const animate = vi.fn(() => ({
      finished: Promise.resolve(),
      cancel() {},
    }));
    HTMLElement.prototype.animate = animate as unknown as typeof Element.prototype.animate;

    const refresh = toState(0);
    const host = document.createElement("div");
    document.body.appendChild(host);
    new ElementNode({
      div: (listener: unknown) => {
        (refresh.get as (l: unknown) => number)(listener);
        return [chartLineInteractive() as DomphyElement];
      },
    } as DomphyElement).render(host);
    flushSync();

    const canvas = host.querySelector("canvas");
    refresh.set(1);
    flushSync();
    expect(host.querySelector("canvas")).toBe(canvas);
    animate.mockClear();

    const tiles = host.querySelectorAll("aside button");
    tiles[1].dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    flushSync();
    // Generation-2 sweepReveal used to close over a fresh null `plotElement`
    // (`_onMount` does not re-run) and skip animate().
    expect(animate).toHaveBeenCalled();
  });
});
