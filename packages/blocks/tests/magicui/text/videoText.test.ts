// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { videoText } from "../../../src/magicui/text/videoText.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeAll(() => {
  // jsdom's own `play()`/`pause()` just log "not implemented" and return
  // `undefined` (not a rejected Promise) — replace both with real stubs so
  // `_onMount`'s autoplay fallback resolves cleanly and quietly.
  (HTMLMediaElement.prototype as any).play = () => Promise.resolve();
  (HTMLMediaElement.prototype as any).pause = () => {};
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("videoText", () => {
  it("renders a working demo with zero arguments: gradient fallback + hidden SVG text mask", () => {
    const { host } = render(videoText());

    const container = host.querySelector('[role="img"]')!;
    expect(container).toBeTruthy();
    expect(container.getAttribute("aria-label")).toBe("OCEAN");
    // No videoSrc given — no <video>, but the mask <text> still carries the word.
    expect(container.querySelector("video")).toBeNull();
    const maskText = container.querySelector("mask text");
    expect(maskText?.textContent).toBe("OCEAN");
  });

  it("renders a masked <video> with autoplay/loop/muted when videoSrc is given", () => {
    const { host } = render(
      videoText({ text: "GLOW", videoSrc: "https://example.com/clip.mp4" }),
    );

    const video = host.querySelector("video") as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.getAttribute("src")).toBe("https://example.com/clip.mp4");
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(host.querySelector("mask text")?.textContent).toBe("GLOW");
  });
});
