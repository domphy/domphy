// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loaderSet } from "../../../src/aceternity/loaders/loaderSet.js";

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

describe("loaderSet", () => {
  it("renders a working demo gallery of all five variants with zero arguments", () => {
    const { host } = render(loaderSet() as DomphyElement);
    flushSync();
    expect(host.textContent).toContain("Simple");
    expect(host.textContent).toContain("Shimmer");
    expect(host.textContent).toContain("Compact");
    expect(host.textContent).toContain("SVG");
    expect(host.textContent).toContain("Glitch");
    expect(host.querySelectorAll('[role="status"]').length).toBe(5);
  });

  it.each(["simple", "compact", "shimmer", "svg", "glitch"] as const)(
    "renders the %s variant alone and removes cleanly without leaking timers",
    (variant) => {
      vi.useFakeTimers();
      const { host, node } = render(loaderSet({ variant }) as DomphyElement);
      flushSync();
      expect(host.querySelector('[role="status"]')).toBeTruthy();

      vi.advanceTimersByTime(500);
      expect(() => node.remove()).not.toThrow();
    },
  );

  it("uses custom text for the shimmer and glitch variants", () => {
    const { host: shimmerHost } = render(loaderSet({ variant: "shimmer", text: "Loading data" }) as DomphyElement);
    expect(shimmerHost.textContent).toBe("Loading data");

    const { host: glitchHost } = render(loaderSet({ variant: "glitch", text: "Please wait" }) as DomphyElement);
    expect(glitchHost.textContent).toContain("Please wait");
  });
});
