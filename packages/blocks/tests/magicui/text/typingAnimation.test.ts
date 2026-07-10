// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { typingAnimation } from "../../../src/magicui/text/typingAnimation.ts";

// An empty reactive text node renders a zero-width-space placeholder anchor
// (core's `TextNode` convention: `textContent === "" ? someZeroWidthChar : ...`)
// until it has real content — stripped before comparing "nothing typed yet" states.
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** The revealed-substring span, distinct from the (always-rendered) trailing cursor glyph. */
function revealedTextOf(host: HTMLElement): string {
  const span = host.querySelector(
    '[data-typing-revealed="true"]',
  ) as HTMLElement;
  return (span?.textContent ?? "").replaceAll(ZERO_WIDTH_SPACE, "");
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("typingAnimation", () => {
  it("renders a working demo with zero args: empty reveal + cursor before the first tick", () => {
    const { host } = render(typingAnimation() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("SPAN");
    expect(wrapper.querySelector('[aria-hidden="true"]')).toBeTruthy(); // cursor glyph
    expect(revealedTextOf(host)).toBe("");
  });

  it("types a single string one character per tick, then stops (no delete/cycle)", () => {
    vi.useFakeTimers();
    const { host } = render(
      typingAnimation({ text: "Hi", typingSpeed: 10 }) as DomphyElement,
    );
    flushSync();

    vi.advanceTimersByTime(10);
    flushSync();
    expect(revealedTextOf(host)).toBe("H");

    vi.advanceTimersByTime(10);
    flushSync();
    expect(revealedTextOf(host)).toBe("Hi");

    // No more phrases to cycle to — stays put well past typingSpeed.
    vi.advanceTimersByTime(1000);
    flushSync();
    expect(revealedTextOf(host)).toBe("Hi");
  });

  it("cycles type → pause → delete → next phrase across a phrase list", () => {
    vi.useFakeTimers();
    const { host } = render(
      typingAnimation({
        text: ["Ab", "Cd"],
        typingSpeed: 10,
        deletingSpeed: 10,
        pauseDuration: 10,
      }) as DomphyElement,
    );
    flushSync();

    // t=20: "Ab" fully typed.
    vi.advanceTimersByTime(20);
    flushSync();
    expect(revealedTextOf(host)).toBe("Ab");

    // Each phase change (typing-done -> pause, pause-done -> deleting,
    // deleting-done -> next word) is its own tick that doesn't touch the
    // revealed text, matching upstream's per-state-transition setTimeout:
    // t=30 typing->pause, t=40 pause->deleting, t=50/60 delete "Ab" chars,
    // t=70 deleting->typing (next word), t=80/90 type "C"/"Cd".
    vi.advanceTimersByTime(70); // total elapsed: 90
    flushSync();
    expect(revealedTextOf(host)).toBe("Cd");
  });

  it("accepts a custom cursor style without throwing", () => {
    expect(() =>
      render(
        typingAnimation({
          text: "Hi",
          cursorStyle: "block",
          cursorBlink: false,
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("removes cleanly and stops the typing timer", () => {
    vi.useFakeTimers();
    const { node } = render(
      typingAnimation({ text: "Hi", typingSpeed: 10 }) as DomphyElement,
    );
    flushSync();
    node.remove();
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
  });
});
