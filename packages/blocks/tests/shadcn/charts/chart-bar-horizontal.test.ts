// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chartBarHorizontal } from "../../../src/shadcn/charts/chart-bar-horizontal.ts";
import { chartBarHorizontalHoverOverlay } from "../../../src/shadcn/charts/chart-bar-shared.ts";

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

describe("chartBarHorizontal", () => {
  it("renders a working demo tree with zero args: card shell, chart frame with hover overlay, and trend footer", () => {
    const { host } = render(chartBarHorizontal() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe(
      "Bar Chart - Horizontal",
    );
    expect(host.querySelector("canvas")).toBeTruthy();
    expect(host.querySelector("footer")?.textContent).toContain(
      "Trending up by 5.2%",
    );
  });

  it("accepts a custom grid and truncation length without throwing", () => {
    const { host } = render(
      chartBarHorizontal({
        categoryTruncateLength: 3,
        grid: { left: 32, right: 8, top: 4, bottom: 4 },
      }) as DomphyElement,
    );
    expect(host.querySelector("canvas")).toBeTruthy();
  });

  it("escapes category and value text before writing tooltip.innerHTML", () => {
    const { host } = render({
      div: [
        {
          div: null,
          $: [
            chartBarHorizontalHoverOverlay({
              categories: ['<img src="x" onerror="alert(1)" alt="xss">'],
              grid: { left: 10, right: 10, top: 10, bottom: 10 },
              showCategoryTitle: true,
              valueLabel: () => "<script>alert(1)</script>",
            }),
          ],
          style: { position: "absolute", inset: "0" },
        },
      ],
      style: { position: "relative", width: "200px", height: "200px" },
    } as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 200,
      right: 200,
      width: 200,
      height: 200,
      toJSON: () => ({}),
    } as DOMRect);

    wrapper.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      }),
    );

    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("script")).toBeNull();
    const tooltip = wrapper.querySelector("div div") as HTMLElement;
    expect(tooltip).toBeTruthy();
    expect(tooltip.innerHTML).toContain("&lt;img");
    expect(tooltip.innerHTML).toContain("&lt;script&gt;");
    expect(tooltip.innerHTML).not.toContain("<img");
    expect(tooltip.innerHTML).not.toContain("<script>");
  });
});
