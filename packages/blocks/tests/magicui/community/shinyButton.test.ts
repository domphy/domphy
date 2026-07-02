// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { shinyButton } from "../../../src/magicui/community/shinyButton.ts";

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

describe("shinyButton", () => {
  it("renders a working demo with zero args: a button with a shimmer animation", () => {
    const { host, node } = render(shinyButton() as DomphyElement);
    const button = host.querySelector("button")!;
    expect(button).toBeTruthy();
    expect(button.textContent).toBe("Shiny Button");
    expect(node.generateCSS()).toContain("animation:");
  });

  it("accepts custom label content and fires the click handler", () => {
    const onClick = vi.fn();
    const { host } = render(
      shinyButton({ children: "Get Started", onClick }) as DomphyElement,
    );
    const button = host.querySelector("button")!;
    expect(button.textContent).toBe("Get Started");
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects the disabled prop", () => {
    const { host } = render(shinyButton({ disabled: true }) as DomphyElement);
    const button = host.querySelector("button")!;
    expect(button.disabled).toBe(true);
  });
});
