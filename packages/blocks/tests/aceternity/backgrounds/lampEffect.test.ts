// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { lampEffect } from "../../../src/aceternity/backgrounds/lampEffect.js";

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

describe("lampEffect", () => {
  it("renders a working demo with zero arguments: a light cone wrapper plus a heading tucked under it", () => {
    const { host } = render(lampEffect());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.textContent).toContain("Build faster, ship brighter");

    const coneWrapper = container.firstElementChild!;
    expect(coneWrapper.getAttribute("aria-hidden")).toBe("true");
    // Two cone halves + two glow blobs + one glow bar.
    expect(coneWrapper.children.length).toBe(5);
  });

  it("accepts a custom glow color and children without throwing", () => {
    const { host } = render(
      lampEffect({ glowColor: "primary", children: { h2: "Custom heading" } }),
    );

    const container = host.firstElementChild!;
    expect(container.textContent).toContain("Custom heading");
  });
});
