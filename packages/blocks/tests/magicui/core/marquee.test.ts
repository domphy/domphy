// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { marquee } from "../../../src/magicui/core/marquee.js";

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

describe("marquee", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(marquee());

    // Outer overflow-hidden container > track (with duplicated groups) + two fade overlays.
    expect(host.children.length).toBe(1);
    const container = host.firstElementChild!;
    expect(container.querySelector("[data-track]")).toBeTruthy();
    // Default repeat count is 4 identical groups.
    expect(container.querySelectorAll("[data-track] > div").length).toBe(4);
    // Fade overlays default on.
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
  });

  it("duplicates duplicate groups after the first as aria-hidden", () => {
    const { host } = render(marquee({ repeat: 3, fade: false }));
    const groups = host.querySelectorAll("[data-track] > div");
    expect(groups.length).toBe(3);
    expect(groups[0].getAttribute("aria-hidden")).toBeNull();
    expect(groups[1].getAttribute("aria-hidden")).toBe("true");
  });

  it("accepts custom items and renders them inside every group", () => {
    const items: DomphyElement[] = [{ span: "Logo A" }, { span: "Logo B" }];
    const { host } = render(marquee({ items, repeat: 2, fade: false }));
    expect(host.textContent).toContain("Logo A");
    expect(host.textContent).toContain("Logo B");
    expect(host.querySelectorAll("[data-track] > div").length).toBe(2);
  });
});
