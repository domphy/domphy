// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { pin3D } from "../../../src/aceternity/effects-3d/pin3D.ts";

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

describe("pin3D", () => {
  it("renders a working demo with zero arguments: link > card > content + pin motif", () => {
    const { host } = render(pin3D() as DomphyElement);
    const link = host.firstElementChild as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("#");

    const card = link.firstElementChild as HTMLElement;
    expect(card.getAttribute("data-tone")).toBe("shift-15");
    // content wrapper + base dot + beam + pill = 4 children
    expect(card.children).toHaveLength(4);
    expect(card.textContent).toContain("3D Pin");
  });

  it("reveals the beam/pill on mouseenter and hides them on mouseleave without throwing", () => {
    const { host } = render(pin3D({ title: "Open repo", href: "/repo" }) as DomphyElement);
    const link = host.firstElementChild as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/repo");
    expect(link.textContent).toContain("Open repo");

    expect(() => link.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }))).not.toThrow();
    expect(() => link.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }))).not.toThrow();
  });

  it("accepts custom children content without throwing", () => {
    expect(() =>
      render(pin3D({ children: { p: "Custom pin content" } as DomphyElement }) as DomphyElement),
    ).not.toThrow();
  });
});
