// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { multiStepLoader } from "../../../src/aceternity/loaders/multiStepLoader.js";

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

const STEPS = [{ text: "Step A" }, { text: "Step B" }, { text: "Step C" }];

describe("multiStepLoader", () => {
  it("renders a working demo with zero arguments (mounted, hidden by default)", () => {
    const { host, node } = render(multiStepLoader() as DomphyElement);
    flushSync();
    expect(host.querySelector('[role="status"]')).toBeTruthy();
    expect(host.textContent).toContain("Buying a condo");
    expect(node.generateCSS()).toContain("opacity: 0");
  });

  it("fades in and auto-advances steps while `loading` is true (fake timers)", () => {
    vi.useFakeTimers();
    const loading = toState(false);
    const { host, node } = render(
      multiStepLoader({ loadingStates: STEPS, loading, duration: 50 }) as DomphyElement,
    );
    flushSync();

    loading.set(true);
    flushSync();
    expect(node.generateCSS()).toContain("opacity: 1");
    expect(node.generateCSS()).toContain("calc(0 * ");

    vi.advanceTimersByTime(50);
    flushSync();
    expect(node.generateCSS()).toContain("calc(-1 * ");

    expect(host.textContent).toContain("Step A");
    expect(host.textContent).toContain("Step B");
  });

  it("closes (and calls onClose) when the built-in close button is clicked", () => {
    const loading = toState(true);
    const onClose = vi.fn();
    const { host } = render(
      multiStepLoader({ loadingStates: STEPS, loading, onClose }) as DomphyElement,
    );
    flushSync();

    host.querySelector('button[aria-label="Close"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    expect(loading.get()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not auto-advance when `value` is manually controlled", () => {
    vi.useFakeTimers();
    const value = toState(1);
    const { node } = render(
      multiStepLoader({ loadingStates: STEPS, loading: true, value, duration: 10 }) as DomphyElement,
    );
    flushSync();
    vi.advanceTimersByTime(1000);
    flushSync();
    expect(node.generateCSS()).toContain("calc(-1 * ");
  });
});
