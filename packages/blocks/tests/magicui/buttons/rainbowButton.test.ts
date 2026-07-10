// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { rainbowButton } from "../../../src/magicui/buttons/rainbowButton.ts";

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

describe("rainbowButton", () => {
  it("renders a working demo button with a glow layer behind it", () => {
    const { host } = render(rainbowButton() as DomphyElement);
    const wrapper = host.querySelector("div");
    expect(wrapper).toBeTruthy();
    const button = host.querySelector("button");
    expect(button).toBeTruthy();
    expect(button!.textContent).toBe("Get unlimited access");
    // Glow layer + button are siblings inside the relatively-positioned wrapper.
    expect(wrapper!.children).toHaveLength(2);
  });

  it("renders custom label content instead of the default demo text", () => {
    const { host } = render(
      rainbowButton({ children: "Upgrade now" }) as DomphyElement,
    );
    expect(host.querySelector("button")!.textContent).toBe("Upgrade now");
  });

  it("default variant paints an animated gradient background on the button", () => {
    const { node } = render(rainbowButton() as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("linear-gradient(90deg");
    expect(css).toContain("background-size: 200% 100%");
    expect(css).toMatch(/animation:.*rainbow-button-flow/);
  });

  it("outline variant uses the dual-layer border trick instead of a solid fill", () => {
    const { node } = render(
      rainbowButton({ variant: "outline" }) as DomphyElement,
    );
    const css = node.generateCSS();
    expect(css).toContain("background-clip: padding-box, border-box");
  });

  it("icon size applies a square aspect ratio", () => {
    const { node } = render(
      rainbowButton({ size: "icon", children: "★" }) as DomphyElement,
    );
    expect(node.generateCSS()).toContain("aspect-ratio: 1");
  });

  it("fires the provided onClick handler when clicked", () => {
    const handleClick = vi.fn();
    const { host } = render(
      rainbowButton({ onClick: handleClick }) as DomphyElement,
    );
    host.querySelector("button")!.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button when disabled:true", () => {
    const { host } = render(rainbowButton({ disabled: true }) as DomphyElement);
    expect(host.querySelector("button")!.disabled).toBe(true);
  });
});
