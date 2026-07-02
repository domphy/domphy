// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { scales } from "../../../src/aceternity/backgrounds/scales.js";

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

describe("scales", () => {
  it("renders a working demo with zero arguments (diagonal, 3 lines per tile)", () => {
    const { host } = render(scales());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.textContent).toContain("Scales");

    const pattern = container.querySelector("pattern")!;
    expect(pattern).toBeTruthy();
    expect(pattern.querySelectorAll("line").length).toBe(3);
  });

  it("renders horizontal/vertical variants with a single line per tile and composites custom children", () => {
    const { host: horizontalHost } = render(scales({ direction: "horizontal" }));
    const horizontalPattern = horizontalHost.firstElementChild!.querySelector("pattern")!;
    expect(horizontalPattern.querySelectorAll("line").length).toBe(1);

    const { host: verticalHost } = render(
      scales({ direction: "vertical", spacing: 20, color: "primary", children: { p: "On top" } }),
    );
    const verticalContainer = verticalHost.firstElementChild!;
    expect(verticalContainer.querySelector("pattern")!.querySelectorAll("line").length).toBe(1);
    expect(verticalContainer.textContent).toContain("On top");
  });
});
