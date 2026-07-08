// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { iphone } from "../../../src/magicui/device-mocks/iphone.js";

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

describe("iphone", () => {
  it("renders a working demo with zero arguments (frame, Dynamic Island, buttons)", () => {
    const { host } = render(iphone());

    const frame = host.querySelector('[role="img"]')!;
    expect(frame).toBeTruthy();
    expect(frame.getAttribute("aria-label")).toContain("iPhone mockup");
    // Dynamic Island + its camera lens + earpiece slit + 4 side buttons (mute, volume
    // up/down, power) = 7 decorative glyphs.
    expect(host.querySelectorAll("svg rect").length).toBe(7);
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("video")).toBeNull();
  });

  it("renders an image inside the screen cutout", () => {
    const { host } = render(iphone({ src: "https://example.com/shot.png", alt: "Onboarding screen" }));
    const image = host.querySelector("img");
    expect(image).toBeTruthy();
    expect(image!.getAttribute("src")).toBe("https://example.com/shot.png");
    expect(image!.getAttribute("alt")).toBe("Onboarding screen");
  });

  it("renders a video inside the screen cutout, preferred over an image", () => {
    const { host } = render(
      iphone({ src: "https://example.com/shot.png", videoSrc: "https://example.com/demo.mp4" }),
    );
    expect(host.querySelector("video")).toBeTruthy();
    expect(host.querySelector("img")).toBeNull();
  });
});
