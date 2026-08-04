// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  type Placement,
  shift,
} from "../src/index";

describe("@domphy/floating", () => {
  it("exposes the floating-ui dom API", () => {
    expect(typeof computePosition).toBe("function");
    expect(typeof autoUpdate).toBe("function");
    expect(typeof offset).toBe("function");
    expect(typeof flip).toBe("function");
    expect(typeof shift).toBe("function");
    expect(typeof arrow).toBe("function");
  });

  it("computes a position with middleware", async () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);

    const placement: Placement = "bottom";
    const result = await computePosition(reference, floating, {
      placement,
      middleware: [offset(8), flip(), shift({ padding: 8 })],
    });

    expect(typeof result.x).toBe("number");
    expect(typeof result.y).toBe("number");
    expect(result.placement).toBeDefined();
    expect(result.middlewareData).toBeDefined();

    reference.remove();
    floating.remove();
  });

  it("autoUpdate returns a cleanup function", () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);
    const cleanup = autoUpdate(reference, floating, () => {});
    expect(typeof cleanup).toBe("function");
    cleanup();
    reference.remove();
    floating.remove();
  });

  it("autoUpdate stops triggering updates after cleanup", () => {
    // Reference inside a scrollable ancestor so autoUpdate subscribes to its
    // scroll events; ResizeObserver/IntersectionObserver paths are disabled to
    // isolate the listener lifecycle (jsdom lacks both observers).
    const scroller = document.createElement("div");
    scroller.style.overflow = "auto";
    const reference = document.createElement("div");
    scroller.append(reference);
    const floating = document.createElement("div");
    document.body.append(scroller, floating);

    let calls = 0;
    const cleanup = autoUpdate(
      reference,
      floating,
      () => {
        calls++;
      },
      { elementResize: false, layoutShift: false, ancestorResize: false },
    );

    const initial = calls; // autoUpdate invokes update() once up front
    scroller.dispatchEvent(new Event("scroll"));
    expect(calls).toBeGreaterThan(initial);

    cleanup();
    const afterCleanup = calls;
    scroller.dispatchEvent(new Event("scroll"));
    expect(calls).toBe(afterCleanup);

    scroller.remove();
    floating.remove();
  });

  it("accepts a null floating element in autoUpdate", () => {
    const reference = document.createElement("div");
    document.body.append(reference);
    const cleanup = autoUpdate(reference, null, () => {}, {
      elementResize: false,
      layoutShift: false,
    });
    expect(typeof cleanup).toBe("function");
    cleanup();
    reference.remove();
  });

  it("positions deterministically against a VirtualElement", async () => {
    // VirtualElement contract: only getBoundingClientRect is required;
    // contextElement anchors the offset-parent chain.
    const virtualReference = {
      getBoundingClientRect: () => ({
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        top: 100,
        left: 100,
        right: 150,
        bottom: 150,
      }),
      contextElement: document.body,
    };
    const floating = document.createElement("div");
    document.body.append(floating);

    const result = await computePosition(virtualReference, floating, {
      placement: "bottom",
    });

    // jsdom reports zero floating dimensions: x centers on the reference
    // (100 + 25), y drops below it (100 + 50).
    expect(result.x).toBe(125);
    expect(result.y).toBe(150);

    floating.remove();
  });

  it("produces finite coordinates for a zero-size reference rect", async () => {
    const virtualReference = {
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }),
      contextElement: document.body,
    };
    const floating = document.createElement("div");
    document.body.append(floating);

    const result = await computePosition(virtualReference, floating, {
      placement: "bottom",
      middleware: [offset(8), flip(), shift({ padding: 8 })],
    });

    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);

    floating.remove();
  });
});
