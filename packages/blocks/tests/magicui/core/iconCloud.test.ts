// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { iconCloud } from "../../../src/magicui/core/iconCloud.ts";

// jsdom has no real 2D canvas backend (no `canvas` npm package installed), so
// `getContext("2d")` resolves to `null` and iconCloud()'s own guard bails out
// of the requestAnimationFrame loop — this only exercises structure, not motion.

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

describe("iconCloud", () => {
  it("renders a working demo tree with zero args: a square wrapper with a filled canvas", () => {
    const { host } = render(iconCloud() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("role")).toBe("img");
    expect(wrapper.querySelector("canvas")).toBeTruthy();
  });

  it("accepts custom icons, size, and image URLs without throwing", () => {
    expect(() =>
      render(
        iconCloud({
          size: 240,
          icons: [{ image: "https://example.com/icon.png", label: "Example" }, { glyphMarkup: "<svg/>" }],
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("tears down cleanly on remove", () => {
    const { node } = render(iconCloud() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
