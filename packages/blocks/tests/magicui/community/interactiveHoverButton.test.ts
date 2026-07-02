// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { interactiveHoverButton } from "../../../src/magicui/community/interactiveHoverButton.js";

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

describe("interactiveHoverButton", () => {
  it("renders a working demo with zero arguments (dot, label, and hidden hover overlay)", () => {
    const { host } = render(interactiveHoverButton());

    const button = host.querySelector("button")!;
    expect(button).toBeTruthy();
    expect(button.querySelector('[data-ihb-dot]')).toBeTruthy();
    expect(button.querySelector('[data-ihb-label]')?.textContent).toBe("Get Started");
    const overlay = button.querySelector('[data-ihb-overlay]')!;
    expect(overlay.textContent).toContain("Get Started");
    expect(overlay.querySelector("svg")).toBeTruthy();
  });

  it("respects a custom label and forwards onClick", () => {
    const onClick = vi.fn();
    const { host } = render(interactiveHoverButton({ children: "Join now", onClick }));

    const button = host.querySelector("button")!;
    expect(button.querySelector('[data-ihb-label]')?.textContent).toBe("Join now");
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
