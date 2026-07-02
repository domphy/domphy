// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { backgroundLines } from "../../../src/aceternity/backgrounds/backgroundLines.ts";

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

describe("backgroundLines", () => {
  it("renders a working demo with zero arguments: a 40-path SVG scatter plus demo heading content", () => {
    const { host } = render(backgroundLines() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.getAttribute("data-tone")).toBe("shift-1");
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.querySelectorAll("path").length).toBe(40);
    expect(container.textContent).toContain("Background Lines");
  });

  it("accepts a custom line count, palette, and duration without throwing", () => {
    const { host } = render(
      backgroundLines({
        lineCount: 6,
        colors: ["primary", "danger"],
        svgOptions: { duration: 4 },
      }) as DomphyElement,
    );
    const svg = (host.firstElementChild as HTMLElement).querySelector("svg");
    expect(svg?.querySelectorAll("path").length).toBe(6);
  });
});
