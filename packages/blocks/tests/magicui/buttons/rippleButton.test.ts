// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { rippleButton } from "../../../src/magicui/buttons/rippleButton.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** Waits real wall-clock time for spawn/cleanup timers to settle. */
function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** The dedicated reactive layer hosting spawned ripple circles (first `aria-hidden`
 * span inside the button — ripple circles themselves are also `aria-hidden`, so this
 * must be resolved before any ripple exists to unambiguously grab the layer itself). */
function rippleLayer(button: HTMLElement): HTMLElement {
  return button.querySelector('span[aria-hidden="true"]')!;
}

function stubBoundingBox(
  button: HTMLElement,
  box: { left: number; top: number; width: number; height: number },
) {
  button.getBoundingClientRect = () =>
    ({
      ...box,
      right: box.left + box.width,
      bottom: box.top + box.height,
      x: box.left,
      y: box.top,
      toJSON() {},
    }) as DOMRect;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("rippleButton", () => {
  it("renders a working demo button with no ripples at rest", () => {
    const { host } = render(rippleButton() as DomphyElement);
    const button = host.querySelector("button")!;
    expect(button).toBeTruthy();
    expect(button.textContent).toBe("Click me");
    expect(rippleLayer(button).children).toHaveLength(0);
  });

  it("renders custom label content instead of the default demo text", () => {
    const { host } = render(rippleButton({ children: "Submit" }) as DomphyElement);
    expect(host.querySelector("button")!.textContent).toBe("Submit");
  });

  it("spawns a ripple positioned at the click coordinates on click", async () => {
    const { host, node } = render(rippleButton() as DomphyElement);
    const button = host.querySelector("button")!;
    stubBoundingBox(button, { left: 10, top: 20, width: 100, height: 40 });

    button.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 60, clientY: 40 }));
    await wait(0);

    expect(rippleLayer(button).children).toHaveLength(1);
    const css = node.generateCSS();
    expect(css).toContain("left: 50px"); // 60 - 10
    expect(css).toContain("top: 20px"); // 40 - 20
  });

  it("removes the ripple after its animation duration elapses", async () => {
    const { host } = render(rippleButton({ duration: 40 }) as DomphyElement);
    const button = host.querySelector("button")!;
    stubBoundingBox(button, { left: 0, top: 0, width: 80, height: 40 });

    button.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 10, clientY: 10 }));
    await wait(0);
    expect(rippleLayer(button).children).toHaveLength(1);

    await wait(80);
    expect(rippleLayer(button).children).toHaveLength(0);
  });

  it("supports multiple overlapping ripples from rapid repeated clicks", async () => {
    const { host } = render(rippleButton() as DomphyElement);
    const button = host.querySelector("button")!;
    stubBoundingBox(button, { left: 0, top: 0, width: 80, height: 40 });

    button.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 }));
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 15, clientY: 15 }));
    await wait(0);

    expect(rippleLayer(button).children).toHaveLength(2);
  });

  it("fires the provided onClick handler alongside the ripple spawn", () => {
    const handleClick = vi.fn();
    const { host } = render(rippleButton({ onClick: handleClick }) as DomphyElement);
    host.querySelector("button")!.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button when disabled:true", () => {
    const { host } = render(rippleButton({ disabled: true }) as DomphyElement);
    expect(host.querySelector("button")!.disabled).toBe(true);
  });
});
