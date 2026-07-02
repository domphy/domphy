// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { coolMode } from "../../../src/magicui/community/coolMode.ts";

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

describe("coolMode", () => {
  it("renders a working demo with zero args: a thin span wrapping a demo button", () => {
    const { host, node } = render(coolMode() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("SPAN");
    expect(wrapper.querySelector("button")).not.toBeNull();
    node.remove();
  });

  it("spawns particles into a shared body-level overlay on pointerdown, not inside the wrapper", () => {
    const { host, node } = render(coolMode() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    wrapper.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 50, clientY: 50 } as MouseEventInit),
    );

    const overlay = document.body.querySelector(":scope > div[aria-hidden='true']");
    expect(overlay).not.toBeNull();
    expect(wrapper.contains(overlay)).toBe(false);

    wrapper.dispatchEvent(new MouseEvent("pointerup"));
    node.remove();
  });

  it("removes cleanly without throwing after a burst is in flight", () => {
    const { host, node } = render(coolMode() as DomphyElement);
    flushSync();
    const wrapper = host.firstElementChild as HTMLElement;
    wrapper.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 10, clientY: 10 } as MouseEventInit),
    );
    expect(() => node.remove()).not.toThrow();
  });
});
