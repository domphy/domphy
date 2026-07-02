// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { animatedCircularProgressBar } from "../../../src/magicui/community/animatedCircularProgressBar.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** Flush reactive microtasks so async attribute/style updates settle. */
function flush() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("animatedCircularProgressBar", () => {
  it("renders a working demo with zero arguments (track + progress circle, centered readout)", () => {
    const { host } = render(animatedCircularProgressBar({ value: 40 }));

    const container = host.querySelector('[role="progressbar"]')!;
    expect(container.getAttribute("aria-valuenow")).toBe("40");
    expect(container.getAttribute("aria-valuemin")).toBe("0");
    expect(container.getAttribute("aria-valuemax")).toBe("100");
    expect(container.querySelectorAll("circle").length).toBe(2);
    expect(container.querySelector("strong")?.textContent).toBe("40%");
  });

  it("updates the arc and readout reactively when a state value changes", async () => {
    const value = toState(10);
    const { host } = render(animatedCircularProgressBar({ value }));

    const container = host.querySelector('[role="progressbar"]')!;
    expect(container.querySelector("strong")?.textContent).toBe("10%");

    value.set(70);
    await flush();

    expect(container.getAttribute("aria-valuenow")).toBe("70");
    expect(container.querySelector("strong")?.textContent).toBe("70%");
  });
});
