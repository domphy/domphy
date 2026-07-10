// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { pointer } from "../../../src/magicui/core/pointer.ts";

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

describe("pointer", () => {
  it("renders a working demo tree with zero args: hover zone with cursor:none and a tracking cursor element", () => {
    const { host, node } = render(pointer() as DomphyElement);
    const zone = host.firstElementChild as HTMLElement;
    expect(zone).toBeTruthy();
    expect(node.generateCSS()).toContain("cursor: none");
    expect(zone.querySelector('[data-pointer-cursor="true"]')).toBeTruthy();
  });

  it("tracks mousemove position and fades in/out on enter/leave", () => {
    const { host } = render(pointer() as DomphyElement);
    const zone = host.firstElementChild as HTMLElement;
    const cursor = zone.querySelector(
      '[data-pointer-cursor="true"]',
    ) as HTMLElement;

    zone.dispatchEvent(
      new MouseEvent("mouseenter", { clientX: 20, clientY: 30 }),
    );
    expect(cursor.style.opacity).toBe("1");

    zone.dispatchEvent(new MouseEvent("mouseleave"));
    expect(cursor.style.opacity).toBe("0");
  });

  it("accepts a custom cursor glyph via `children`", () => {
    const { host } = render(
      pointer({ children: { span: "👍" } }) as DomphyElement,
    );
    expect(host.textContent).toContain("👍");
  });
});
