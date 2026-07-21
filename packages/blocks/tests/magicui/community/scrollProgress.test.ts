// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollProgress } from "../../../src/magicui/community/scrollProgress.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("scrollProgress", () => {
  it("renders a single fixed-position bar with zero args and a resting fill", () => {
    const { host, node } = render(scrollProgress() as DomphyElement);
    expect(host.children.length).toBe(1);
    const css = node.generateCSS();
    expect(css).toContain("position: fixed");
    // CSS resting default before paint; used when the page has no overflow.
    expect(css).toMatch(/scaleX\(0\.42\)/);
  });

  it("uses resting floor only when the page has no overflow", () => {
    // jsdom defaults: scrollHeight === clientHeight → no overflow → floor.
    const { host } = render(scrollProgress() as DomphyElement);
    const bar = host.firstElementChild as HTMLElement;
    expect(bar.style.transform).toBe("scaleX(0.42)");
  });

  it("shows scaleX(0) at scroll top when the page can scroll", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get: () => 2000,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => 0,
    });

    const { host } = render(scrollProgress() as DomphyElement);
    const bar = host.firstElementChild as HTMLElement;
    // Legitimate top-of-page progress is 0 — not the catalog resting floor.
    expect(bar.style.transform).toBe("scaleX(0)");
  });

  it("tracks scroll fraction when the page can scroll", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get: () => 2000,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      get: () => 800,
    });
    let scrollY = 600; // 600 / 1200 = 0.5
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => scrollY,
    });

    const { host } = render(scrollProgress() as DomphyElement);
    const bar = host.firstElementChild as HTMLElement;
    expect(bar.style.transform).toBe("scaleX(0.5)");

    scrollY = 1200;
    window.dispatchEvent(new Event("scroll"));
    expect(bar.style.transform).toBe("scaleX(1)");
  });

  it("does not throw on scroll/resize and cleans up listeners on removal", () => {
    const { node } = render(scrollProgress() as DomphyElement);
    expect(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });

  it("applies custom colors/thickness to the bar's style", () => {
    const { node } = render(
      scrollProgress({ colors: ["success"], thickness: 2 }) as DomphyElement,
    );
    const css = node.generateCSS();
    expect(css).toContain("calc(0.5em)");
    expect(css).toContain("var(--success-");
  });
});
