// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { spinningText } from "../../../src/magicui/text/spinningText.ts";

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

describe("spinningText", () => {
  it("renders a working demo with zero args: an accessible wrapper around a spinning character ring", () => {
    const { host } = render(spinningText() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();

    // Every glyph is its own aria-hidden span, pre-placed on the ring — the
    // default phrase ("learn more") appears exactly once, plus the single
    // trailing gap character upstream pushes onto the letters array.
    const characters = wrapper.querySelectorAll('span[aria-hidden="true"]');
    expect(characters.length).toBe("learn more".length + 1);

    // The full phrase stays screen-reader accessible via a visually-hidden span.
    const srOnly = Array.from(wrapper.querySelectorAll("span")).find(
      (span) => !span.hasAttribute("aria-hidden"),
    );
    expect(srOnly?.textContent).toBe("learn more");
  });

  it("sizes the ring box so absolute glyphs do not collapse layout to 0×0", () => {
    const { node } = render(spinningText({ radius: 5 }) as DomphyElement);
    const css = node.generateCSS();
    // radius 5 → boxCh = 12 → width/height 12ch
    expect(css).toMatch(/width:\s*12ch/);
    expect(css).toMatch(/height:\s*12ch/);
  });

  it("spins in reverse and honors a custom radius/duration without throwing", () => {
    expect(() =>
      render(
        spinningText({
          children: "grow",
          reverse: true,
          duration: 6,
          radius: 8,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("places every character with its own precomputed rotate+translate transform", () => {
    const { host, node } = render(
      spinningText({ children: "hi" }) as DomphyElement,
    );
    // "hi" (2 chars) plus the single trailing gap character = 3 spans.
    const characters = host.querySelectorAll('[aria-hidden="true"]');
    expect(characters.length).toBe(3);
    // Declarative `style:` objects compile to class-based CSS (not inline
    // `style="..."` attributes), so assert against the generated stylesheet.
    const css = node.generateCSS();
    const rotateMatches =
      css.match(/rotate\([^)]+deg\) translateY\(calc\(/g) ?? [];
    // At least one match per character (the generated stylesheet may also
    // emit vendor-prefixed duplicates of the same `transform` declaration).
    expect(rotateMatches.length).toBeGreaterThanOrEqual(characters.length);
    // Distinct characters land at distinct angles around the circle.
    expect(css).toContain(`rotate(${360 / characters.length}deg)`);
  });
});
