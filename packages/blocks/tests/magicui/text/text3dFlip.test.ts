// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { text3dFlip } from "../../../src/magicui/text/text3dFlip.ts";

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

describe("text3dFlip", () => {
  it("renders a working demo: one paragraph with a front/back flip cell per non-space character", () => {
    const { host, node } = render(text3dFlip() as DomphyElement);
    flushSync();

    // Upstream defaults its `as` prop to "p" (a plain, unstyled line of
    // text whose size comes from the caller's style), not a heading tag.
    const paragraph = host.querySelector("p");
    expect(paragraph).toBeTruthy();

    // The full phrase is exposed to screen readers via an sr-only label, so the
    // decorative per-character cells can stay aria-hidden.
    expect(paragraph?.firstElementChild?.textContent).toBe(
      "Fortune favors the bold",
    );

    const flipChars = host.querySelectorAll("[data-flip-char]");
    const frontFaces = Array.from(host.querySelectorAll('[data-face="front"]'));
    const backFaces = Array.from(host.querySelectorAll('[data-face="back"]'));
    // One cube-corner cell (front + back face) per non-space character.
    expect(flipChars.length).toBe(frontFaces.length);
    expect(frontFaces.length).toBeGreaterThan(0);
    expect(frontFaces.length).toBe(backFaces.length);

    // Same glyph on both faces by default (upstream shows the identical
    // character front and back — the back is not a different phrase).
    expect(frontFaces[0].textContent).toBe(backFaces[0].textContent);

    // Front faces reconstruct the phrase's non-space characters, one cell each
    // (spaces are their own non-flipping cells between words, so they drop out
    // of this join).
    const frontText = frontFaces.map((face) => face.textContent).join("");
    expect(frontText).toBe("Fortunefavorsthebold");

    // The back faces are aria-hidden duplicates; the front faces carry the
    // real accessible text.
    expect(backFaces[0]?.getAttribute("aria-hidden")).toBe("true");

    // The flip is JS/WAAPI-driven (mouseenter → one-shot ripple), NOT a CSS
    // :hover-hold rule — so the generated CSS must not contain a hover flip.
    expect(node.generateCSS()).not.toContain(":hover");
  });

  it("plays a one-shot ripple on mouseenter and reverts (does not hold)", () => {
    // jsdom has no Web Animations API, so element.animate is stubbed to record
    // the keyframes/options each character cell is driven with — proving the
    // handler rolls each char to the 90° face, holds until the whole staggered
    // group settles, then cancels every animation together (does not hold
    // indefinitely on pointer-over).
    const animations: { keyframes: unknown; options: unknown }[] = [];
    const original = (HTMLElement.prototype as unknown as { animate?: unknown })
      .animate;
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = (
      keyframes: unknown,
      options: unknown,
    ) => {
      animations.push({ keyframes, options });
      // Minimal Animation-like stub: only `.finished` (a resolved promise) and
      // `.cancel()` are used by the block.
      return { finished: Promise.resolve(), cancel: () => {} };
    };

    try {
      const { host } = render(text3dFlip() as DomphyElement);
      flushSync();

      const paragraph = host.querySelector("p")!;
      const flipCharCount = host.querySelectorAll("[data-flip-char]").length;

      paragraph.dispatchEvent(new Event("mouseenter"));
      expect(animations.length).toBe(flipCharCount);

      // Each character rolls FROM the resting transform TO the 90° roll target
      // and HOLDS there (fill "forwards"): the block awaits the whole staggered
      // group before canceling every animation together, matching upstream's
      // own two-phase staggered-group-animate then zero-duration group reset.
      const first = animations[0];
      const keyframes = first.keyframes as { transform: string }[];
      expect(keyframes).toHaveLength(2);
      expect(keyframes[1].transform).toBe("rotateY(90deg)"); // default edge = right
      expect((first.options as { fill: string }).fill).toBe("forwards");

      // Guard: a second mouseenter while the first ripple is still running does
      // not start a second overlapping set of animations.
      const countAfterFirst = animations.length;
      paragraph.dispatchEvent(new Event("mouseenter"));
      expect(animations.length).toBe(countAfterFirst);
    } finally {
      if (original === undefined) {
        delete (HTMLElement.prototype as unknown as { animate?: unknown })
          .animate;
      } else {
        (HTMLElement.prototype as unknown as { animate: unknown }).animate =
          original;
      }
    }
  });

  it("accepts custom text, an edge, a stagger origin, and opt-in flipped glyphs without throwing", () => {
    expect(() =>
      render(
        text3dFlip({
          children: "Hi there",
          edge: "top",
          staggerFrom: "center",
          flippedChildren: "Yo world",
          flippedColor: "primary",
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });
});
