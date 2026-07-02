// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { imagesBadge } from "../../../src/aceternity/backgrounds/imagesBadge.ts";

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

describe("imagesBadge", () => {
  it("renders a working demo with zero arguments: a div badge with a folder icon, label, and 3 hoverable thumbnails", () => {
    const { host } = render(imagesBadge() as DomphyElement);
    const badge = host.firstElementChild as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.tagName).toBe("DIV");
    expect(badge.textContent).toContain("Photos");
    expect(badge.querySelectorAll("img")).toHaveLength(3);
    expect(badge.querySelector('[data-images-badge-image="0"]')).toBeTruthy();
    expect(badge.querySelector('[data-images-badge-image="2"]')).toBeTruthy();
  });

  it("renders as an anchor when href is supplied", () => {
    const { host } = render(imagesBadge({ href: "/gallery", target: "_blank" }) as DomphyElement);
    const badge = host.firstElementChild as HTMLElement;
    expect(badge.tagName).toBe("A");
    expect(badge.getAttribute("href")).toBe("/gallery");
    expect(badge.getAttribute("target")).toBe("_blank");
  });

  it("accepts a custom label, image list, and fan geometry without throwing", () => {
    expect(() =>
      render(
        imagesBadge({
          label: "Vacation",
          images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
          spreadX: 30,
          rotateDeg: 20,
          hoverTranslateY: -50,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });
});
