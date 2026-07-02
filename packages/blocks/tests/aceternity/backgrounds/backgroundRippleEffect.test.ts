// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { backgroundRippleEffect } from "../../../src/aceternity/backgrounds/backgroundRippleEffect.js";

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

describe("backgroundRippleEffect", () => {
  it("renders a working demo with zero arguments (default 8×27 grid)", () => {
    const { host } = render(backgroundRippleEffect());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.textContent).toContain("Background Ripple Effect");
    expect(container.querySelectorAll("[data-row]").length).toBe(8 * 27);
  });

  it("sends a distance-staggered ripple on click and fires onCellClick with the clicked cell", () => {
    const onCellClick = vi.fn();
    const { host } = render(
      backgroundRippleEffect({ rows: 2, columns: 3, cellSize: 20, onCellClick }),
    );

    const container = host.firstElementChild!;
    const cells = Array.from(container.querySelectorAll("[data-row]")) as HTMLElement[];
    expect(cells.length).toBe(6);

    const clickedCell = cells.find(
      (cell) => cell.getAttribute("data-row") === "0" && cell.getAttribute("data-col") === "1",
    )!;
    clickedCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onCellClick).toHaveBeenCalledWith({ row: 0, column: 1 });
    // The clicked cell itself has zero grid-distance, so its animation-delay is 0ms.
    expect(clickedCell.style.animation.endsWith("ease-out 0ms")).toBe(true);
    // A farther cell (distance > 0) gets a longer, distance-proportional stagger
    // delay in its animation shorthand — different from the clicked cell's.
    const farCell = cells.find(
      (cell) => cell.getAttribute("data-row") === "1" && cell.getAttribute("data-col") === "0",
    )!;
    expect(farCell.style.animation).toBeTruthy();
    expect(farCell.style.animation).not.toBe(clickedCell.style.animation);
  });
});
