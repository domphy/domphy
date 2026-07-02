// @vitest-environment jsdom

// jsdom has no real 2D canvas backend and no `navigator.mediaDevices` (no
// `canvas` npm package installed, no camera hardware), so the component's own
// guards bail out before the sampling loop starts and `onWebcamError` fires
// synchronously — this only exercises structure/fallback wiring, not motion.

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { webcamPixelGrid } from "../../../src/aceternity/backgrounds/webcamPixelGrid.ts";

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

describe("webcamPixelGrid", () => {
  it("renders a working demo with zero arguments: hidden video + canvas in a dark rounded container", () => {
    const { host } = render(webcamPixelGrid() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.getAttribute("data-tone")).toBe("shift-16");
    expect(container.querySelector("video")).toBeTruthy();
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("reports onWebcamError when no camera API is available in this environment", () => {
    let capturedError: unknown = null;
    render(
      webcamPixelGrid({
        onWebcamError: (error) => {
          capturedError = error;
        },
      }) as DomphyElement,
    );
    expect(capturedError).toBeTruthy();
  });

  it("accepts custom grid resolution and monochrome mode without throwing", () => {
    expect(() =>
      render(
        webcamPixelGrid({
          gridCols: 16,
          gridRows: 12,
          colorMode: "monochrome",
          mirror: false,
          invertColors: true,
          darken: 0.3,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });
});
