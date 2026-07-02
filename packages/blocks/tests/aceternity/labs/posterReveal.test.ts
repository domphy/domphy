// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { posterReveal } from "../../../src/aceternity/labs/posterReveal.ts";

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

function findGrid(frame: HTMLElement): HTMLElement {
  const wrapper = frame.children[0] as HTMLElement;
  return wrapper.children[0] as HTMLElement;
}

describe("posterReveal", () => {
  it("renders a working demo with zero args: a 3x3 panel grid plus a wordmark layer and a replay control", () => {
    const { host } = render(posterReveal() as DomphyElement);
    const frame = host.firstElementChild as HTMLElement;
    expect(frame.getAttribute("data-tone")).toBe("shift-17");
    expect(findGrid(frame).children.length).toBe(10); // 9 panels + 1 wordmark layer

    const replayButton = frame.querySelector('button[aria-label="Replay poster reveal"]');
    expect(replayButton).toBeTruthy();
  });

  it("clicking replay does not throw and re-renders the full poster subtree", () => {
    const { host } = render(posterReveal() as DomphyElement);
    const frame = host.firstElementChild as HTMLElement;
    const replayButton = frame.querySelector('button[aria-label="Replay poster reveal"]') as HTMLButtonElement;

    expect(() => replayButton.click()).not.toThrow();
    expect(findGrid(frame).children.length).toBe(10);
  });
});
