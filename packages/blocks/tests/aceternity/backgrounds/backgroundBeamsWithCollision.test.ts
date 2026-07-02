// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { backgroundBeamsWithCollision } from "../../../src/aceternity/backgrounds/backgroundBeamsWithCollision.ts";

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

describe("backgroundBeamsWithCollision", () => {
  it("renders a working demo with zero arguments: 12 falling beams plus demo headline content", () => {
    const { host } = render(backgroundBeamsWithCollision() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.getAttribute("data-tone")).toBe("shift-1");
    const floor = container.firstElementChild as HTMLElement;
    expect(floor.querySelectorAll("span").length).toBeGreaterThanOrEqual(12);
    expect(container.textContent).toContain("Ship faster with");
  });

  it("accepts a custom beam count and colors without throwing", () => {
    expect(() =>
      render(
        backgroundBeamsWithCollision({
          beamCount: 4,
          beamColor: "info",
          particleColor: "highlight",
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(backgroundBeamsWithCollision() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
