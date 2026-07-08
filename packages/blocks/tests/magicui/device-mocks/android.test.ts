// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { android } from "../../../src/magicui/device-mocks/android.js";

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

describe("android", () => {
  it("renders a working demo with zero arguments at the default 433x882 size", () => {
    const { host, node } = render(android());

    const frame = host.querySelector('[role="img"]') as HTMLElement;
    expect(frame).toBeTruthy();
    expect(frame.getAttribute("aria-label")).toContain("Android phone mockup");
    const css = node.generateCSS();
    expect(css).toContain("width: 433px");
    expect(css).toContain("height: 882px");
    // Punch-hole camera (outer ring + inner lens circle) + 2 side-button glyphs
    // (tall volume rocker, short power button), matching upstream's 2 authored
    // button paths.
    expect(host.querySelectorAll("svg circle").length).toBe(2);
    expect(host.querySelectorAll("svg rect").length).toBe(2);
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("video")).toBeNull();
  });

  it("resizes via explicit width/height props", () => {
    const { node } = render(android({ width: 300, height: 620 }));
    const css = node.generateCSS();
    expect(css).toContain("width: 300px");
    expect(css).toContain("height: 620px");
  });

  it("renders an image inside the screen area", () => {
    const { host } = render(android({ src: "https://example.com/shot.png", alt: "Home screen" }));
    const image = host.querySelector("img");
    expect(image).toBeTruthy();
    expect(image!.getAttribute("alt")).toBe("Home screen");
  });

  it("renders a video inside the screen area, preferred over an image", () => {
    const { host } = render(
      android({ src: "https://example.com/shot.png", videoSrc: "https://example.com/demo.mp4" }),
    );
    expect(host.querySelector("video")).toBeTruthy();
    expect(host.querySelector("img")).toBeNull();
  });
});
