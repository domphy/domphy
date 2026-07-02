// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { gradientAnimation } from "../../../src/aceternity/backgrounds/gradientAnimation.js";

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

describe("gradientAnimation", () => {
  it("renders a working demo with zero arguments: 5 drifting blobs + an interactive pointer blob", () => {
    const { host } = render(gradientAnimation());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.textContent).toContain("animated, ambient gradient background");

    const blobsWrapper = container.firstElementChild!;
    // 5 passive blobs + 1 pointer-follow blob.
    expect(blobsWrapper.children.length).toBe(6);
    expect(blobsWrapper.querySelector('[data-gradient-pointer-blob="true"]')).toBeTruthy();
  });

  it("omits the pointer blob when interactive:false, and accepts custom content", () => {
    const { host } = render(
      gradientAnimation({
        interactive: false,
        blendMode: "screen",
        children: { h2: "Custom hero" },
      }),
    );

    const container = host.firstElementChild!;
    const blobsWrapper = container.firstElementChild!;
    expect(blobsWrapper.children.length).toBe(5);
    expect(blobsWrapper.querySelector('[data-gradient-pointer-blob="true"]')).toBeFalsy();
    expect(container.textContent).toContain("Custom hero");
  });
});
