// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { animatedShinyText } from "../../../src/magicui/text/animatedShinyText.js";

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

describe("animatedShinyText", () => {
  it("renders a working demo with zero arguments: badge pill with shimmering text + arrow", () => {
    const { host } = render(animatedShinyText() as DomphyElement);

    expect(host.textContent).toContain("Introducing Domphy Blocks");
    expect(host.querySelector('[data-shiny-arrow="true"]')).toBeTruthy();
    // Exactly one top-level badge wrapper.
    expect(host.children.length).toBe(1);
  });

  it("renders just the shimmering span when showBadge is false", () => {
    const { host } = render(
      animatedShinyText({ showBadge: false }) as DomphyElement,
    );

    expect(host.querySelector('[data-shiny-arrow="true"]')).toBeNull();
    const span = host.querySelector("span")!;
    expect(span.textContent).toBe("Introducing Domphy Blocks");
  });

  it("accepts custom text content", () => {
    const { host } = render(
      animatedShinyText({ children: "New: v2 is here" }) as DomphyElement,
    );
    expect(host.textContent).toContain("New: v2 is here");
  });
});
