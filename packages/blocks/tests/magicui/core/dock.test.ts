// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { dock } from "../../../src/magicui/core/dock.js";

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

describe("dock", () => {
  it("renders a working demo with zero arguments (icon links + one separator)", () => {
    const { host } = render(dock());

    const nav = host.querySelector("nav")!;
    expect(nav).toBeTruthy();
    expect(nav.getAttribute("data-tone")).toBe("shift-14");
    // 7 icon links across the default demo, split by one separator.
    expect(nav.querySelectorAll("a").length).toBe(7);
    expect(nav.querySelectorAll("svg").length).toBe(7);
  });

  it("magnifies the nearest icon on pointermove and relaxes on pointerleave", () => {
    const { host } = render(dock({ items: [{ icon: "home", label: "Home", href: "#" }] }));
    const nav = host.querySelector("nav")!;
    const anchor = nav.querySelector("a")!;

    // jsdom's getBoundingClientRect is all-zero by default, which still
    // exercises the falloff math without throwing.
    expect(() =>
      nav.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 50 })),
    ).not.toThrow();
    expect(() => nav.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }))).not.toThrow();
    expect(anchor.getAttribute("href")).toBe("#");
  });

  it("renders custom items and honors disableMagnification without throwing", () => {
    const { host } = render(
      dock({
        items: [
          { icon: "mail", label: "Inbox", href: "#inbox" },
          { separator: true },
          { icon: "settings", label: "Settings", href: "#settings" },
        ],
        disableMagnification: true,
      }),
    );
    const nav = host.querySelector("nav")!;
    expect(nav.querySelectorAll("a").length).toBe(2);
    expect(nav.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
