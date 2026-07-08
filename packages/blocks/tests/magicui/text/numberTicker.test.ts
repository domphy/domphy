// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { numberTicker } from "../../../src/magicui/text/numberTicker.js";

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

describe("numberTicker", () => {
  it("renders a working demo with zero arguments: starts at the formatted startValue (0)", () => {
    const { host } = render(numberTicker() as DomphyElement);

    const span = host.querySelector(
      '[data-number-ticker="true"]',
    ) as HTMLElement;
    expect(span).toBeTruthy();
    expect(span.tagName).toBe("SPAN");
    expect(span.textContent).toBe("0");
  });

  it("still paints the literal startValue as the pre-trigger text when direction is 'down' (matches upstream's static JSX children, not the count's flipped starting point)", () => {
    const { host } = render(
      numberTicker({
        value: 250,
        startValue: 0,
        direction: "down",
      }) as DomphyElement,
    );
    const span = host.querySelector(
      '[data-number-ticker="true"]',
    ) as HTMLElement;
    expect(span.textContent).toBe("0");
  });

  it("formats decimal places and thousands separators via Intl.NumberFormat once the spring settles", () => {
    // Drive the rAF spring loop via fake timers so it can settle inside the
    // test instead of asserting the raw (unformatted) pre-trigger text.
    vi.useFakeTimers();
    const { host } = render(
      numberTicker({
        value: 1234.5,
        startValue: 1000,
        decimalPlaces: 1,
      }) as DomphyElement,
    );
    const span = host.querySelector(
      '[data-number-ticker="true"]',
    ) as HTMLElement;
    // No IntersectionObserver in jsdom -> fails open and triggers on mount.
    // Advance well past the spring's settle time: the overdamped decay's
    // slower pole (~1.715/s here) needs ln(distance/restDelta)/pole seconds
    // to fall under restDelta, which for a 234.5-wide count is ~6s.
    vi.advanceTimersByTime(12000);
    expect(span.textContent).toBe("1,234.5");
  });

  it("does not throw once mounted (rAF spring loop starts without error)", () => {
    expect(() => render(numberTicker() as DomphyElement)).not.toThrow();
  });
});
