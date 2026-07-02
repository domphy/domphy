// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hoverBorderGradient } from "../../../src/aceternity/buttons/hoverBorderGradient.js";

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

describe("hoverBorderGradient", () => {
  it("renders a working demo button with a glow layer and content layer", () => {
    const { host } = render(hoverBorderGradient() as DomphyElement);
    const button = host.querySelector("button");
    expect(button).toBeTruthy();
    expect(button!.textContent).toBe("Aceternity UI");
    expect(button!.querySelector('[data-slot="hbg-glow"]')).toBeTruthy();
    expect(button!.querySelector('[data-slot="hbg-content"]')).toBeTruthy();
  });

  it("renders as a div or anchor when `as` is set", () => {
    const { host: divHost } = render(hoverBorderGradient({ as: "div" }) as DomphyElement);
    expect(divHost.querySelector("div > [data-slot='hbg-content']")).toBeTruthy();

    const { host: linkHost } = render(hoverBorderGradient({ as: "a", href: "/docs" }) as DomphyElement);
    const anchor = linkHost.querySelector("a");
    expect(anchor).toBeTruthy();
    expect(anchor!.getAttribute("href")).toBe("/docs");
  });

  it("fires onClick and removes cleanly (stopping the perimeter loop)", () => {
    const handleClick = vi.fn();
    const { host, node } = render(hoverBorderGradient({ onClick: handleClick }) as DomphyElement);
    host.querySelector("button")!.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(() => node.remove()).not.toThrow();
  });
});
