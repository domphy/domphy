// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chartAreaInteractive } from "../../../src/shadcn/charts/chart-area-interactive.ts";

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

describe("chartAreaInteractive", () => {
  it("renders a working demo tree with zero args: card shell, range select, and chart frame (no footer)", () => {
    const { host } = render(chartAreaInteractive() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Area Chart - Interactive",
    );
    expect(host.querySelector("canvas")).toBeTruthy();
    const select = host.querySelector("select") as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(3);
    expect(select.value).toBe("90");
    expect(host.querySelector("footer")).toBeNull();
  });

  it("switching the range select does not throw and re-renders the chart", () => {
    const { host } = render(chartAreaInteractive() as DomphyElement);
    const select = host.querySelector("select") as HTMLSelectElement;
    select.value = "7";
    expect(() =>
      select.dispatchEvent(new Event("change", { bubbles: true })),
    ).not.toThrow();
  });

  it("replays the range-change reveal after an ancestor re-render reuses the frame", () => {
    const animate = vi.fn(() => ({
      finished: Promise.resolve(),
      cancel() {},
    }));
    HTMLElement.prototype.animate =
      animate as unknown as typeof Element.prototype.animate;

    const refresh = toState(0);
    const host = document.createElement("div");
    document.body.appendChild(host);
    new ElementNode({
      div: (listener: unknown) => {
        (refresh.get as (l: unknown) => number)(listener);
        return [chartAreaInteractive() as DomphyElement];
      },
    } as DomphyElement).render(host);
    flushSync();

    const select = host.querySelector("select") as HTMLSelectElement;
    select.value = "7";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    flushSync();
    expect(animate.mock.calls.length).toBeGreaterThan(0);

    const canvas = host.querySelector("canvas");
    refresh.set(1);
    flushSync();
    expect(host.querySelector("canvas")).toBe(canvas);
    animate.mockClear();

    const reusedSelect = host.querySelector("select") as HTMLSelectElement;
    reusedSelect.value = "30";
    reusedSelect.dispatchEvent(new Event("change", { bubbles: true }));
    flushSync();
    // Generation-2 replayReveal used to close over a fresh null
    // `chartFrameElement` (`_onMount` does not re-run) and skip animate().
    expect(animate).toHaveBeenCalled();
  });
});
