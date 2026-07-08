// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { safari } from "../../../src/magicui/device-mocks/safari.js";

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

describe("safari", () => {
  it("renders a working demo with zero arguments (frame, toolbar, empty screen)", () => {
    const { host } = render(safari());

    const frame = host.querySelector('[role="img"]')!;
    expect(frame).toBeTruthy();
    expect(frame.getAttribute("aria-label")).toContain("domphy.com");
    // Three traffic-light dots in default mode.
    expect(host.querySelectorAll("svg circle").length).toBe(3);
    expect(host.textContent).toContain("domphy.com");
    // No media supplied — no img/video rendered.
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("video")).toBeNull();
  });

  it("renders an image inside the screen area", () => {
    const { host } = render(safari({ url: "example.com", imageSrc: "https://example.com/shot.png" }));
    const image = host.querySelector("img");
    expect(image).toBeTruthy();
    expect(image!.getAttribute("src")).toBe("https://example.com/shot.png");
  });

  it("renders a video inside the screen area, preferred over an image", () => {
    const { host } = render(
      safari({ imageSrc: "https://example.com/shot.png", videoSrc: "https://example.com/demo.mp4" }),
    );
    expect(host.querySelector("video")).toBeTruthy();
    expect(host.querySelector("img")).toBeNull();
  });

  it("'simple' mode strips the extra nav/action icons but keeps the traffic lights and address bar", () => {
    const { host } = render(safari({ mode: "simple", url: "example.com" }));
    // Upstream renders the 3 traffic-light dots unconditionally (outside the
    // `mode` branch) — only the 8 extra nav/action glyphs are gated on "default".
    expect(host.querySelectorAll("svg circle").length).toBe(3);
    // Only the address bar's lock icon path remains; the 8 nav/action glyphs are gone.
    expect(host.querySelectorAll("svg path").length).toBe(1);
    expect(host.textContent).toContain("example.com");
  });
});
