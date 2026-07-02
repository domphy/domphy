// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { textHighlighter } from "../../../src/magicui/text/textHighlighter.ts";

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

describe("textHighlighter", () => {
  it("renders a working demo: text wrapped by a rough-notation annotation", () => {
    const { host } = render(textHighlighter() as DomphyElement);
    flushSync();

    const wrapper = host.querySelector("span");
    expect(wrapper).toBeTruthy();
    expect(wrapper?.textContent).toContain("highlighter");
    // rough-notation attaches its own sketchy SVG as a sibling of the target span.
    expect(host.querySelector("svg.rough-annotation")).toBeTruthy();
  });

  it("accepts a different annotation type/color, and doesn't throw once the draw timer fires", () => {
    vi.useFakeTimers();
    expect(() =>
      render(
        textHighlighter({ type: "underline", color: "primary", children: "Underlined" }) as DomphyElement,
      ),
    ).not.toThrow();
    // The draw-in animation depends on SVGGeometryElement.getTotalLength(), which
    // some DOM environments (including this test's jsdom) don't implement — the
    // component must fail open rather than crash when that timer fires.
    expect(() => vi.advanceTimersByTime(200)).not.toThrow();
  });

  it("removes cleanly, tearing down the annotation", () => {
    const { node } = render(textHighlighter() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
