// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { shimmerButton } from "../../../src/magicui/buttons/shimmerButton.ts";

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

describe("shimmerButton", () => {
  it("renders a working demo button with its overlay layers", () => {
    const { host } = render(shimmerButton() as DomphyElement);
    const button = host.querySelector("button");
    expect(button).toBeTruthy();
    expect(button!.textContent).toBe("Shimmer Button");
    // rotating sliver + ring mask + hover glow + label span.
    expect(button!.querySelectorAll("span")).toHaveLength(4);
  });

  it("renders custom label content instead of the default demo text", () => {
    const { host } = render(shimmerButton({ children: "Join now" }) as DomphyElement);
    expect(host.querySelector("button")!.textContent).toBe("Join now");
  });

  it("uses a dark edge tone anchor so the fill is fixed regardless of page context", () => {
    const { host } = render(shimmerButton() as DomphyElement);
    expect(host.querySelector("button")!.getAttribute("data-tone")).toBe("shift-15");
  });

  it("continuously spins the highlight sliver via a conic-gradient keyframe loop", () => {
    const { node } = render(shimmerButton() as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("conic-gradient(from 0deg");
    expect(css).toMatch(/animation:.*shimmer-button-spin/);
    expect(css).toContain("overflow: hidden");
  });

  it("wires the hover glow to a data-slot descendant selector", () => {
    const { host, node } = render(shimmerButton() as DomphyElement);
    const glow = host.querySelector('[data-slot="shimmer-hover-glow"]');
    expect(glow).toBeTruthy();
    expect(node.generateCSS()).toContain("[data-slot=shimmer-hover-glow]");
  });

  it("fires the provided onClick handler when clicked", () => {
    const handleClick = vi.fn();
    const { host } = render(shimmerButton({ onClick: handleClick }) as DomphyElement);
    host.querySelector("button")!.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button when disabled:true", () => {
    const { host } = render(shimmerButton({ disabled: true }) as DomphyElement);
    expect(host.querySelector("button")!.disabled).toBe(true);
  });
});
