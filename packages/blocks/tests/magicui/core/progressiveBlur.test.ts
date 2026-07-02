// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { progressiveBlur } from "../../../src/magicui/core/progressiveBlur.ts";

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

describe("progressiveBlur", () => {
  it("renders a working demo tree with zero args: content panel + 8 stacked blur bands at the bottom edge", () => {
    const { host, node } = render(progressiveBlur() as DomphyElement);
    expect(host.textContent).toContain("Progressive Blur");
    const css = node.generateCSS();
    expect(css).toContain("backdrop-filter");
    expect(css).toContain("blur(64px)");
    expect(css).toContain("blur(0.5px)");
  });

  it("stacks blur bands for both edges when edges: ['top', 'bottom']", () => {
    const { node } = render(
      progressiveBlur({ edges: ["top", "bottom"], blurSteps: [1, 2, 4] }) as DomphyElement,
    );
    const css = node.generateCSS();
    expect(css).toContain("blur(1px)");
    expect(css).toContain("blur(2px)");
    expect(css).toContain("blur(4px)");
  });

  it("accepts custom content", () => {
    const { host } = render(
      progressiveBlur({ content: [{ p: "Custom body copy" }] }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom body copy");
  });
});
