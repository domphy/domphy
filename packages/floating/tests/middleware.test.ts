// Behavior fixtures for the core middleware (flip / shift / arrow). These run
// the vendored @floating-ui/core against a mock platform with fixed rects, so
// a botched future upstream sync that changes middleware math fails here.
import { describe, expect, it } from "vitest";
import { arrow, computePosition, flip, shift } from "../src/core/index";

interface MockRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MockElement {
  width: number;
  height: number;
}

// Minimal Platform implementation over plain rects: the "viewport" is a fixed
// clipping rect, elements are plain {width, height} objects.
function createMockPlatform(viewport: MockRect, referenceRect: MockRect) {
  return {
    getElementRects: ({ floating }: { floating: MockElement }) => ({
      reference: { ...referenceRect },
      floating: { x: 0, y: 0, width: floating.width, height: floating.height },
    }),
    getDimensions: (element: MockElement) => ({
      width: element.width,
      height: element.height,
    }),
    getClippingRect: () => ({ ...viewport }),
  } as any;
}

const VIEWPORT: MockRect = { x: 0, y: 0, width: 500, height: 500 };

describe("middleware fixtures", () => {
  describe("flip()", () => {
    it("flips bottom to top when the bottom overflows", async () => {
      const referenceRect = { x: 225, y: 400, width: 50, height: 50 };
      const floating = { width: 100, height: 100 };
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [flip()],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      expect(result.placement).toBe("top");
      expect(result.x).toBe(200);
      expect(result.y).toBe(300);
    });

    it("keeps the placement when nothing overflows", async () => {
      const referenceRect = { x: 225, y: 100, width: 50, height: 50 };
      const floating = { width: 100, height: 100 };
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [flip()],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      expect(result.placement).toBe("bottom");
      expect(result.x).toBe(200);
      expect(result.y).toBe(150);
    });
  });

  describe("shift()", () => {
    const referenceRect = { x: 450, y: 100, width: 50, height: 50 };
    const floating = { width: 100, height: 50 };

    it("shifts the floating element back into the viewport", async () => {
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [shift()],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      // Initial x would be 425 (right edge 525 > 500); clamped to 400.
      expect(result.x).toBe(400);
      expect(result.y).toBe(150);
      // shift() data reports the applied delta, not the final coordinate.
      expect(result.middlewareData.shift?.x).toBe(-25);
    });

    it("respects padding", async () => {
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [shift({ padding: 10 })],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      expect(result.x).toBe(390);
    });
  });

  describe("arrow()", () => {
    it("centers the arrow on the reference element", async () => {
      const referenceRect = { x: 100, y: 100, width: 50, height: 50 };
      const floating = { width: 200, height: 50 };
      const arrowElement = { width: 20, height: 10 };
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [arrow({ element: arrowElement })],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      // Floating at x=25; reference center at x=125 → arrow at 125-25-10=90.
      expect(result.middlewareData.arrow?.x).toBe(90);
      expect(result.middlewareData.arrow?.centerOffset).toBe(0);
    });

    it("reports centerOffset when the arrow cannot stay centered", async () => {
      // Reference center at x=0, floating shifted right to x=0 by shift().
      const referenceRect = { x: -50, y: 100, width: 100, height: 50 };
      const floating = { width: 200, height: 50 };
      const arrowElement = { width: 20, height: 10 };
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [shift(), arrow({ element: arrowElement })],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      expect(result.x).toBe(0);
      // Ideal arrow center (-10) is clamped to 0 → centerOffset reports -10.
      expect(result.middlewareData.arrow?.x).toBe(0);
      expect(result.middlewareData.arrow?.centerOffset).toBe(-10);
    });
  });
});
