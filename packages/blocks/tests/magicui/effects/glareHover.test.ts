// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { glareHover } from "../../../src/magicui/effects/glareHover.js";

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

describe("glareHover", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(glareHover());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    expect(container.getAttribute("data-glare-armed")).toBe("true");
    expect(container.querySelector("[data-glare-band]")).toBeTruthy();
    expect(container.textContent).toContain("Glare Hover");
  });

  it("accepts custom children and playOnce without throwing", () => {
    const { host } = render(
      glareHover({
        children: { p: "Custom CTA" },
        playOnce: true,
        glareColor: "primary",
        angle: -30,
        duration: 800,
      }),
    );

    const container = host.firstElementChild!;
    expect(container.textContent).toContain("Custom CTA");
    expect(container.querySelector("[data-glare-band]")).toBeTruthy();
  });
});
