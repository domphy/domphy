// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { smoothCursor } from "../../../src/magicui/core/smoothCursor.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  // smoothCursor's _onMount mutates document.body.style.cursor directly (not
  // through Domphy's style object), so it survives `innerHTML = ""` and must
  // be reset explicitly to isolate tests from each other.
  document.body.style.cursor = "";
});

describe("smoothCursor", () => {
  it("renders a working demo tree with zero args: fixed-position glyph and global cursor:none", () => {
    const { host, node } = render(smoothCursor() as DomphyElement);
    const wrapper = host.querySelector('[data-smooth-cursor="true"]') as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(node.generateCSS()).toContain("position: fixed");
    expect(wrapper.querySelector("svg")).toBeTruthy();
    expect(document.body.style.cursor).toBe("none");
  });

  it("moves toward the mouse position on mousemove without throwing", () => {
    const { host, node } = render(smoothCursor() as DomphyElement);
    const wrapper = host.querySelector('[data-smooth-cursor="true"]') as HTMLElement;
    expect(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 120, clientY: 80 }));
    }).not.toThrow();
    expect(wrapper.style.opacity).toBe("1");
    node.remove();
  });

  it("restores the native cursor on removal", () => {
    const { node } = render(smoothCursor() as DomphyElement);
    expect(document.body.style.cursor).toBe("none");
    node.remove();
    expect(document.body.style.cursor).not.toBe("none");
  });

  it("accepts a custom cursor glyph via `children`", () => {
    const { host } = render(smoothCursor({ children: { span: "cursor" } }) as DomphyElement);
    expect(host.textContent).toContain("cursor");
  });
});
