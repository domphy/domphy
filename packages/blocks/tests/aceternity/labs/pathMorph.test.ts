// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { pathMorph } from "../../../src/aceternity/labs/pathMorph.ts";

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

describe("pathMorph", () => {
  it("renders a working demo with zero args: a button with a two-path glyph, starting on the pause label", () => {
    const { host } = render(pathMorph() as DomphyElement);
    const button = host.firstElementChild as HTMLButtonElement;
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("aria-label")).toBe("Pause");

    const paths = button.querySelectorAll("svg path");
    expect(paths.length).toBe(2);
  });

  it("clicking toggles the aria-label and fires onToggle with the new value", () => {
    let lastValue: boolean | null = null;
    const { host } = render(pathMorph({ onToggle: (playing) => (lastValue = playing) }) as DomphyElement);
    const button = host.firstElementChild as HTMLButtonElement;

    button.click();
    flushSync(); // reactive attribute updates flush on a microtask — drain it synchronously

    expect(button.getAttribute("aria-label")).toBe("Play");
    expect(lastValue).toBe(false);
  });
});
