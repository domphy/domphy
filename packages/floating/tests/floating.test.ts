// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  detectOverflow,
  flip,
  getOverflowAncestors,
  hide,
  inline,
  limitShift,
  offset,
  type Placement,
  platform,
  shift,
  type VirtualElement,
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

function platformWithCache() {
  return { ...platform, _c: new Map() };
}

function stubClientRect(
  element: HTMLElement,
  rect: { x: number; y: number; width: number; height: number },
) {
  element.getBoundingClientRect = () =>
    ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.y,
      left: rect.x,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
      toJSON() {
        return this;
      },
    }) as DOMRect;
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    value: rect.width,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: rect.height,
  });
  Object.defineProperty(element, "clientTop", {
    configurable: true,
    value: 0,
  });
  Object.defineProperty(element, "clientLeft", {
    configurable: true,
    value: 0,
  });
}

function mockPlatform(
  viewport: { x: number; y: number; width: number; height: number },
  referenceRect: { x: number; y: number; width: number; height: number },
  floatingSize: { width: number; height: number },
) {
  return {
    getElementRects: () => ({
      reference: { ...referenceRect },
      floating: { x: 0, y: 0, ...floatingSize },
    }),
    getClippingRect: () => ({ ...viewport }),
    getDimensions: () => ({ ...floatingSize }),
  };
}

describe("1.8.0 platform claims", () => {
  it("resolves distinct clipping rects for viewport vs layoutViewport", () => {
    const previousVisualViewport = window.visualViewport;
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        width: 400,
        height: 300,
        offsetLeft: 50,
        offsetTop: 25,
        scale: 1,
        pageLeft: 50,
        pageTop: 25,
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return true;
        },
        onresize: null,
        onscroll: null,
      },
    });

    const element = document.createElement("div");
    document.body.append(element);
    const host = platformWithCache();
    const args = {
      element,
      boundary: [] as [],
      strategy: "fixed" as const,
    };

    try {
      const visual = host.getClippingRect({
        ...args,
        rootBoundary: "viewport",
      });
      const layout = host.getClippingRect({
        ...args,
        rootBoundary: "layoutViewport",
      });

      expect(visual).toEqual({ x: 50, y: 25, width: 400, height: 300 });
      expect(layout.x).toBe(0);
      expect(layout.y).toBe(0);
      expect(layout.width).not.toBe(visual.width);
      expect(layout.height).not.toBe(visual.height);
    } finally {
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: previousVisualViewport,
      });
      element.remove();
    }
  });

  it("computePosition + shift accepts rootBoundary layoutViewport", async () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);

    const result = await computePosition(reference, floating, {
      middleware: [shift({ rootBoundary: "layoutViewport" })],
    });

    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);

    reference.remove();
    floating.remove();
  });

  it("platform.getClientRects returns [] for a VirtualElement without getClientRects", () => {
    const virtualReference: VirtualElement = {
      getBoundingClientRect: () => ({
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        top: 10,
        left: 10,
        right: 30,
        bottom: 30,
      }),
    };

    expect(platform.getClientRects(virtualReference as never)).toEqual([]);
  });

  it("inline() on a VirtualElement without getClientRects stays finite", async () => {
    const virtualReference: VirtualElement = {
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
      middleware: [inline()],
    });

    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
    expect(result.x).toBe(125);
    expect(result.y).toBe(150);

    floating.remove();
  });

  it("getClippingRect drops a non-containing overflow ancestor for position:fixed", () => {
    const clipper = document.createElement("div");
    clipper.style.overflow = "hidden";
    clipper.style.position = "relative";
    stubClientRect(clipper, { x: 10, y: 10, width: 80, height: 80 });

    const absolute = document.createElement("div");
    absolute.style.position = "absolute";
    const fixed = document.createElement("div");
    fixed.style.position = "fixed";
    clipper.append(absolute, fixed);
    document.body.append(clipper);

    const host = platformWithCache();
    // Explicit root rect: jsdom's layout viewport is often 0×0, which would
    // invert the clipper∩viewport intersection and hide the ancestor filter.
    const rootBoundary = { x: 0, y: 0, width: 2000, height: 2000 };
    const clipped = host.getClippingRect({
      element: absolute,
      boundary: "clippingAncestors",
      rootBoundary,
      strategy: "absolute",
    });
    const unclipped = host.getClippingRect({
      element: fixed,
      boundary: "clippingAncestors",
      rootBoundary,
      strategy: "fixed",
    });

    expect(clipped).toEqual({ x: 10, y: 10, width: 80, height: 80 });
    expect(unclipped).toEqual(rootBoundary);

    clipper.remove();
  });

  it("getClippingRect keeps a transform overflow ancestor for position:fixed", () => {
    const clipper = document.createElement("div");
    clipper.style.overflow = "hidden";
    clipper.style.transform = "translate(0)";
    stubClientRect(clipper, { x: 10, y: 10, width: 80, height: 80 });

    const fixed = document.createElement("div");
    fixed.style.position = "fixed";
    clipper.append(fixed);
    document.body.append(clipper);

    const host = platformWithCache();
    const rootBoundary = { x: 0, y: 0, width: 2000, height: 2000 };
    const clipped = host.getClippingRect({
      element: fixed,
      boundary: "clippingAncestors",
      rootBoundary,
      strategy: "fixed",
    });

    expect(clipped).toEqual({ x: 10, y: 10, width: 80, height: 80 });

    clipper.remove();
  });
});

describe("public surface", () => {
  it("autoPlacement picks the side with room from the public export", async () => {
    const floating = document.createElement("div");
    const result = await computePosition(
      { x: 225, y: 400, width: 50, height: 50 } as never,
      floating,
      {
        middleware: [autoPlacement({ allowedPlacements: ["bottom", "top"] })],
        platform: mockPlatform(
          { x: 0, y: 0, width: 500, height: 500 },
          { x: 225, y: 400, width: 50, height: 50 },
          { width: 100, height: 100 },
        ),
      },
    );

    expect(result.placement).toBe("top");
    expect(result.x).toBe(200);
    expect(result.y).toBe(300);
  });

  it("limitShift stops shift() before the floating element loses the reference", async () => {
    const floating = document.createElement("div");
    const referenceRect = { x: 90, y: 100, width: 20, height: 20 };
    const viewport = { x: 0, y: 0, width: 80, height: 500 };
    const floatingSize = { width: 80, height: 40 };
    const options = {
      platform: mockPlatform(viewport, referenceRect, floatingSize),
    };

    const unlimited = await computePosition(
      referenceRect as never,
      floating,
      { middleware: [shift()], ...options },
    );
    const limited = await computePosition(referenceRect as never, floating, {
      middleware: [shift({ limiter: limitShift() })],
      ...options,
    });

    expect(unlimited.x).toBe(0);
    expect(limited.x).toBe(10);
    expect(limited.y).toBe(unlimited.y);
  });

  it("detectOverflow returns side offsets when called from custom middleware", async () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);

    let overflow: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    } | null = null;
    await computePosition(reference, floating, {
      middleware: [
        {
          name: "probe-overflow",
          async fn(state) {
            overflow = await detectOverflow(state);
            return {};
          },
        },
      ],
    });

    expect(overflow).not.toBeNull();
    expect(typeof overflow!.top).toBe("number");
    expect(typeof overflow!.right).toBe("number");
    expect(typeof overflow!.bottom).toBe("number");
    expect(typeof overflow!.left).toBe("number");

    reference.remove();
    floating.remove();
  });

  it("platform.getElementRects returns reference and floating rects", async () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);

    const rects = await platform.getElementRects({
      reference,
      floating,
      strategy: "absolute",
    });

    expect(rects.reference).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    });
    expect(rects.floating).toEqual({
      x: 0,
      y: 0,
      width: expect.any(Number),
      height: expect.any(Number),
    });

    reference.remove();
    floating.remove();
  });

  it("getOverflowAncestors includes an overflow parent and the window", () => {
    const scroller = document.createElement("div");
    scroller.style.overflow = "auto";
    const child = document.createElement("div");
    scroller.append(child);
    document.body.append(scroller);

    const ancestors = getOverflowAncestors(child);
    expect(ancestors).toContain(scroller);
    expect(ancestors).toContain(window);

    scroller.remove();
  });

  it("hide() reports referenceHidden through the public export", async () => {
    const floating = document.createElement("div");
    const hidden = await computePosition(
      { x: 600, y: 600, width: 50, height: 50 } as never,
      floating,
      {
        middleware: [hide()],
        platform: mockPlatform(
          { x: 0, y: 0, width: 500, height: 500 },
          { x: 600, y: 600, width: 50, height: 50 },
          { width: 100, height: 50 },
        ),
      },
    );
    const visible = await computePosition(
      { x: 225, y: 100, width: 50, height: 50 } as never,
      floating,
      {
        middleware: [hide()],
        platform: mockPlatform(
          { x: 0, y: 0, width: 500, height: 500 },
          { x: 225, y: 100, width: 50, height: 50 },
          { width: 100, height: 50 },
        ),
      },
    );

    expect(hidden.middlewareData.hide?.referenceHidden).toBe(true);
    expect(visible.middlewareData.hide?.referenceHidden).toBe(false);
  });

  it("hide({ strategy: 'escaped' }) reports escaped when the floating element leaves the boundary", async () => {
    const floating = document.createElement("div");
    const escaped = await computePosition(
      { x: 600, y: 600, width: 50, height: 50 } as never,
      floating,
      {
        middleware: [hide({ strategy: "escaped" })],
        platform: mockPlatform(
          { x: 0, y: 0, width: 500, height: 500 },
          { x: 600, y: 600, width: 50, height: 50 },
          { width: 100, height: 50 },
        ),
      },
    );
    const contained = await computePosition(
      { x: 225, y: 100, width: 50, height: 50 } as never,
      floating,
      {
        middleware: [hide({ strategy: "escaped" })],
        platform: mockPlatform(
          { x: 0, y: 0, width: 500, height: 500 },
          { x: 225, y: 100, width: 50, height: 50 },
          { width: 100, height: 50 },
        ),
      },
    );

    expect(escaped.middlewareData.hide?.escaped).toBe(true);
    expect(contained.middlewareData.hide?.escaped).toBe(false);
  });
});
