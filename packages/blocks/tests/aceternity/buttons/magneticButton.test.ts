// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { magneticButton } from "../../../src/aceternity/buttons/magneticButton.js";

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

describe("magneticButton", () => {
  it("renders a working demo with zero arguments: a wrapper around a demo CTA button", () => {
    const { host } = render(magneticButton() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    const button = wrapper.querySelector("button");
    expect(button).toBeTruthy();
    expect(button!.textContent).toBe("Follow @mannupaaji");
  });

  it("wraps a custom child instead of the default demo button", () => {
    const { host } = render(
      magneticButton({ children: { a: "Custom link", href: "#" } as DomphyElement<"a"> }) as DomphyElement,
    );
    const link = host.querySelector("a");
    expect(link).toBeTruthy();
    expect(link!.textContent).toBe("Custom link");
  });

  it("handles pointermove/pointerleave and removes cleanly without throwing", () => {
    const { host, node } = render(magneticButton() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;

    expect(() =>
      wrapper.dispatchEvent(new PointerEvent("pointermove", { clientX: 1000, clientY: 1000, bubbles: true })),
    ).not.toThrow();
    expect(() => wrapper.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }))).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });
});
