// @vitest-environment jsdom
// Regression test for the reused-node lifecycle break in confettiButton (and
// the confetti factory): the imperative canvas-confetti instance used to live
// in the factory closure, assigned only from `_onMount` — which runs ONCE for
// the first DOM generation. After any ancestor re-render (a FRESH factory
// closure on the SAME reused DOM nodes), the live-rebound onClick closed over
// the new generation's still-null `handle` and clicks silently did nothing.
// The instance now lives in a `behavior()` (created once per real DOM node,
// later generations routed through update()), so clicks keep firing.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { confettiButton } from "../../../src/magicui/effects/confetti.js";

// Mock canvas-confetti so the fire path is directly assertable (the sibling
// confetti.test.ts stubs the 2D context and runs the real library instead).
const { mockFire, mockCreate } = vi.hoisted(() => {
  const mockFire = Object.assign(vi.fn(), { reset: vi.fn() });
  const mockCreate = vi.fn(() => mockFire);
  return { mockFire, mockCreate };
});
vi.mock("canvas-confetti", () => ({ default: { create: mockCreate } }));

beforeEach(() => {
  mockFire.mockClear();
  mockFire.reset.mockClear();
  mockCreate.mockClear();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("confettiButton — reused-node lifecycle", () => {
  it("still fires after an ancestor re-render reuses the DOM nodes", () => {
    const counter = toState(0);
    const host = document.createElement("div");
    document.body.appendChild(host);

    const node = new ElementNode({
      div: (listener: any) => {
        counter.get(listener);
        return [{ div: [confettiButton()] }];
      },
    } as DomphyElement);
    node.render(host);
    flushSync();

    const buttonElement = host.querySelector("button")!;
    const canvasBefore = host.querySelector("canvas");
    expect(buttonElement).toBeTruthy();
    expect(canvasBefore).toBeTruthy();
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Ancestor re-render: a FRESH confettiButton() closure is built, but the
    // button/canvas DOM nodes are reused and patched in place.
    counter.set(1);
    flushSync();

    expect(host.querySelector("canvas")).toBe(canvasBefore);
    // No second confetti instance for the reused canvas node.
    expect(mockCreate).toHaveBeenCalledTimes(1);

    buttonElement.click();
    expect(mockFire).toHaveBeenCalledTimes(1);
    expect(mockFire).toHaveBeenCalledWith(
      expect.objectContaining({ origin: expect.any(Object) }),
    );

    // And once more after a second re-render generation.
    counter.set(2);
    flushSync();
    buttonElement.click();
    expect(mockFire).toHaveBeenCalledTimes(2);
  });

  it("resets the instance when the node is removed", () => {
    const visible = toState(true);
    const host = document.createElement("div");
    document.body.appendChild(host);

    const node = new ElementNode({
      div: (listener: any) =>
        visible.get(listener) ? [{ div: [confettiButton()] }] : [],
    } as DomphyElement);
    node.render(host);
    flushSync();

    visible.set(false);
    flushSync();

    expect(mockFire.reset).toHaveBeenCalledTimes(1);
  });
});
