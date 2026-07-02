// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pulsatingButton } from "../../../src/magicui/community/pulsatingButton.ts";

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

describe("pulsatingButton", () => {
  it("renders a working demo with zero args: a button with a decorative glow layer and a label", () => {
    const { host } = render(pulsatingButton() as DomphyElement);
    flushSync();

    const buttonElement = host.querySelector("button")!;
    expect(buttonElement.textContent).toBe("Pulsating Button");
    const glowLayer = buttonElement.querySelector("span[aria-hidden='true']");
    expect(glowLayer).not.toBeNull();
  });

  it("fires the click handler", () => {
    const handleClick = vi.fn();
    const { host } = render(
      pulsatingButton({ children: "Go", onClick: handleClick }) as DomphyElement,
    );
    flushSync();

    host.querySelector("button")!.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders the ripple variant without throwing", () => {
    expect(() => render(pulsatingButton({ variant: "ripple" }) as DomphyElement)).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(pulsatingButton() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
