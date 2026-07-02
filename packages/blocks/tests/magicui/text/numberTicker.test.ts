// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
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

  it("starts at the formatted target value when direction is 'down'", () => {
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
    expect(span.textContent).toBe("250");
  });

  it("formats decimal places and thousands separators via Intl.NumberFormat", () => {
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
    expect(span.textContent).toBe("1,000.0");
  });

  it("does not throw once mounted (rAF spring loop starts without error)", () => {
    expect(() => render(numberTicker() as DomphyElement)).not.toThrow();
  });
});
