// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, State } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { lens } from "../../../src/magicui/core/lens.ts";

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

describe("lens", () => {
  it("renders a working demo tree with zero args: base content plus a hidden circular overlay with a cloned zoom layer", () => {
    const { host } = render(lens() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();

    const baseContent = wrapper.querySelector('[data-lens-content="true"]') as HTMLElement;
    expect(baseContent.querySelector("img")).toBeTruthy();

    const overlay = wrapper.querySelector('[data-lens-overlay="true"]') as HTMLElement;
    expect(overlay).toBeTruthy();

    const zoomLayer = overlay.querySelector('[data-lens-zoom-layer="true"]') as HTMLElement;
    // The base content was cloned into the zoom layer on mount.
    expect(zoomLayer.querySelector("img")).toBeTruthy();
  });

  it("tracks mousemove and fades the overlay in/out on enter/leave (follow mode)", () => {
    const { host } = render(lens() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    const overlay = wrapper.querySelector('[data-lens-overlay="true"]') as HTMLElement;

    wrapper.dispatchEvent(new MouseEvent("mouseenter", { clientX: 40, clientY: 30 }));
    expect(overlay.style.opacity).toBe("1");

    wrapper.dispatchEvent(new MouseEvent("mouseleave"));
    expect(overlay.style.opacity).toBe("0");
  });

  it("pins the lens visible immediately and reacts to position state updates in static mode", () => {
    const positionState = new State({ x: 20, y: 20 });
    const { host } = render(lens({ isStatic: true, position: positionState }) as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    const overlay = wrapper.querySelector('[data-lens-overlay="true"]') as HTMLElement;

    // The `effect()` driving static-mode position runs immediately on mount,
    // so the overlay is already positioned (imperative `transform` write)
    // without any hover interaction.
    const initialTransform = overlay.style.transform;
    expect(initialTransform).toContain("translate(");

    positionState.set({ x: 90, y: 70 });
    flushSync();
    expect(overlay.style.transform).not.toBe(initialTransform);
  });
});
