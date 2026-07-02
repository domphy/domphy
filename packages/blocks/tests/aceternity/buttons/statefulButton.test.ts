// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { statefulButton } from "../../../src/aceternity/buttons/statefulButton.js";

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

describe("statefulButton", () => {
  it("renders a working demo with the idle label", () => {
    const { host } = render(statefulButton() as DomphyElement);
    flushSync();
    const button = host.querySelector("button")!;
    expect(button.textContent).toBe("Send message");
    expect(button.getAttribute("aria-busy")).toBe("false");
  });

  it("morphs idle -> loading -> success -> back to idle around a click", async () => {
    vi.useFakeTimers();
    const { host } = render(statefulButton({ onClick: () => {}, successHoldDuration: 300 }) as DomphyElement);
    flushSync();
    const button = host.querySelector("button")!;

    button.click();
    flushSync();
    expect(button.getAttribute("aria-busy")).toBe("true");

    // Let the async handler's `await` resolve and swap into the success state.
    await Promise.resolve();
    await Promise.resolve();
    flushSync();
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(button.textContent).toBe("");

    vi.advanceTimersByTime(300);
    flushSync();
    expect(button.textContent).toBe("Send message");
  });

  it("ignores clicks while already loading/success", () => {
    const handleClick = vi.fn();
    const { host } = render(statefulButton({ onClick: handleClick }) as DomphyElement);
    flushSync();
    const button = host.querySelector("button")!;

    button.click();
    button.click();
    flushSync();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
