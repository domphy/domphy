// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pixelImage } from "../../../src/magicui/community/pixelImage.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("pixelImage", () => {
  it("renders a working demo with zero args: 6x4 = 24 clipped tile images", () => {
    const { host } = render(pixelImage() as DomphyElement);
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    expect(container.getAttribute("role")).toBe("img");
    const tiles = container.querySelectorAll("img");
    expect(tiles.length).toBe(24);
    expect(tiles[0].getAttribute("aria-hidden")).toBe("true");
  });

  it("honors an explicit rows x cols override", () => {
    const { host } = render(pixelImage({ rows: 2, cols: 3 }) as DomphyElement);
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    expect(container.querySelectorAll("img").length).toBe(6);
  });

  it("reveals tiles shortly after mount", () => {
    // Reactive style props render into a generated CSS class rule (not the
    // element's own inline `style` attribute) — inspect via `generateCSS()`,
    // the same idiom `button-family.test.ts`/`scrollProgress.test.ts` use
    // for asserting on reactive style output elsewhere in this repo.
    vi.useFakeTimers();
    const { node } = render(pixelImage({ rows: 1, cols: 1 }) as DomphyElement);
    flushSync();
    expect(node.generateCSS()).toContain("opacity: 0");

    vi.advanceTimersByTime(10);
    flushSync();

    expect(node.generateCSS()).toContain("opacity: 1");
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(pixelImage() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
