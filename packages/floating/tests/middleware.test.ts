// Behavior fixtures for the core middleware (flip / shift / arrow). These run
// the vendored @floating-ui/core against a mock platform with fixed rects, so
// a botched future upstream sync that changes middleware math fails here.
import { describe, expect, it } from "vitest";
import {
  arrow,
  computePosition,
  flip,
  hide,
  inline,
  offset,
  shift,
  size,
} from "../src/core/index";

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
// clipping rect, elements are plain {width, height} objects. Extra platform
// methods (getClientRects, isRTL) can be layered on per test.
function createMockPlatform(
  viewport: MockRect,
  referenceRect: MockRect,
  extras: Record<string, unknown> = {},
) {
  return {
    getElementRects: ({
      reference,
      floating,
    }: {
      reference: MockRect | { getBoundingClientRect: () => MockRect };
      floating: MockElement;
    }) => ({
      // The inline() middleware re-calls this with a virtual reference
      // ({getBoundingClientRect}) after a reset — honor it when present.
      reference:
        typeof (reference as { getBoundingClientRect?: unknown })
          .getBoundingClientRect === "function"
          ? (() => {
              const rect = (
                reference as { getBoundingClientRect: () => MockRect }
              ).getBoundingClientRect();
              return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              };
            })()
          : { ...referenceRect },
      floating: { x: 0, y: 0, width: floating.width, height: floating.height },
    }),
    getDimensions: (element: MockElement) => ({
      width: element.width,
      height: element.height,
    }),
    getClippingRect: () => ({ ...viewport }),
    ...extras,
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

  describe("offset()", () => {
    const referenceRect = { x: 100, y: 100, width: 50, height: 50 };
    const floating = { width: 100, height: 100 };

    it("applies a numeric value on the main axis", async () => {
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [offset(10)],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      expect(result.x).toBe(75);
      expect(result.y).toBe(160);
    });

    it("applies mainAxis and crossAxis independently", async () => {
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [offset({ mainAxis: 10, crossAxis: 5 })],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      expect(result.x).toBe(80);
      expect(result.y).toBe(160);
    });
  });

  describe("placement alignment with RTL", () => {
    const referenceRect = { x: 100, y: 100, width: 50, height: 50 };
    const floating = { width: 80, height: 40 };

    it("mirrors start alignment on top/bottom placements when RTL", async () => {
      // isVertical (top/bottom side) is where RTL inverts the cross axis:
      // "start" aligns to the right edge in RTL contexts.
      const ltr = await computePosition(referenceRect, floating, {
        placement: "bottom-start",
        platform: createMockPlatform(VIEWPORT, referenceRect, {
          isRTL: () => false,
        }),
      } as any);
      const rtl = await computePosition(referenceRect, floating, {
        placement: "bottom-start",
        platform: createMockPlatform(VIEWPORT, referenceRect, {
          isRTL: () => true,
        }),
      } as any);

      // Base x is 85 (reference center 125 - half floating width 40); start
      // alignment shifts by -commonAlign (50-80)/2 = ±15 along the cross axis,
      // inverted under RTL.
      expect(ltr.x).toBe(100);
      expect(rtl.x).toBe(70);
      expect(ltr.y).toBe(150);
      expect(rtl.y).toBe(150);
    });

    it("ignores RTL on left/right placements", async () => {
      const ltr = await computePosition(referenceRect, floating, {
        placement: "right-start",
        platform: createMockPlatform(VIEWPORT, referenceRect, {
          isRTL: () => false,
        }),
      } as any);
      const rtl = await computePosition(referenceRect, floating, {
        placement: "right-start",
        platform: createMockPlatform(VIEWPORT, referenceRect, {
          isRTL: () => true,
        }),
      } as any);

      expect(ltr.x).toBe(150);
      expect(ltr.y).toBe(100);
      expect(rtl.x).toBe(ltr.x);
      expect(rtl.y).toBe(ltr.y);
    });
  });

  describe("size()", () => {
    it("computes available width for a centered element overflowing both sides", async () => {
      // Pins the @floating-ui/core@1.8.0 fix: available size must subtract
      // twice the LARGER side overflow, not twice the SUM of both sides.
      const referenceRect = { x: 225, y: 100, width: 50, height: 50 };
      const floating = { width: 600, height: 50 };
      let applied: { availableWidth: number; availableHeight: number } | null =
        null;
      await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [
          size({
            apply: (args: any) => {
              applied = {
                availableWidth: args.availableWidth,
                availableHeight: args.availableHeight,
              };
            },
          }),
        ],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      // Centered at x=-50: 50px overflow on both sides → 600 - 2*50 = 500.
      expect(applied).not.toBeNull();
      expect(applied!.availableWidth).toBe(500);
    });

    it("uses the LARGER side only when the two-sided overflow is asymmetric", async () => {
      // Companion pin for the 1.8.0 fix: the old math (width - 2*(left+right))
      // yields 400 here; the fixed math (width - 2*max(left, right)) yields 150.
      const referenceRect = { x: 50, y: 100, width: 50, height: 50 };
      const floating = { width: 600, height: 50 };
      let applied: { availableWidth: number; availableHeight: number } | null =
        null;
      await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [
          size({
            apply: (args: any) => {
              applied = {
                availableWidth: args.availableWidth,
                availableHeight: args.availableHeight,
              };
            },
          }),
        ],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      // Centered at x=-225: left overflow 225, right edge 375 (no right
      // overflow, overflow.right = -125) → 600 - 2*max(225, -125) = 150.
      expect(applied!.availableWidth).toBe(150);
    });

    it("applies the same centered math to availableHeight on left/right placements", async () => {
      const referenceRect = { x: 100, y: 50, width: 50, height: 50 };
      const floating = { width: 100, height: 600 };
      let applied: { availableWidth: number; availableHeight: number } | null =
        null;
      const result = await computePosition(referenceRect, floating, {
        placement: "right",
        middleware: [
          size({
            apply: (args: any) => {
              applied = {
                availableWidth: args.availableWidth,
                availableHeight: args.availableHeight,
              };
            },
          }),
        ],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      // Vertically centered at y=-225: top overflow 225, bottom edge 375
      // (overflow.bottom = -125) → 600 - 2*max(225, -125) = 150.
      expect(result.x).toBe(150);
      expect(applied!.availableHeight).toBe(150);
    });

    it("skips the centered both-sides formula for aligned placements", async () => {
      // With an alignment (bottom-start) only the alignment-side overflow
      // constrains the available width: width - overflow[widthSide].
      const referenceRect = { x: 225, y: 100, width: 50, height: 50 };
      const floating = { width: 600, height: 50 };
      let applied: { availableWidth: number; availableHeight: number } | null =
        null;
      await computePosition(referenceRect, floating, {
        placement: "bottom-start",
        middleware: [
          size({
            apply: (args: any) => {
              applied = {
                availableWidth: args.availableWidth,
                availableHeight: args.availableHeight,
              };
            },
          }),
        ],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      // Start-aligned at x=225: right edge 825 → overflow.right 325,
      // overflow.left -225; min(600-325, 600-(-225)-325) = 275.
      expect(applied!.availableWidth).toBe(275);
    });

    it("reports the full clipping width when shift() is enabled on that axis", async () => {
      // shift() owning the x axis frees size() from side-overflow math:
      // availableWidth is the maximum clipping width instead.
      const referenceRect = { x: 450, y: 100, width: 50, height: 50 };
      const floating = { width: 100, height: 50 };
      let applied: { availableWidth: number; availableHeight: number } | null =
        null;
      await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [
          shift(),
          size({
            apply: (args: any) => {
              applied = {
                availableWidth: args.availableWidth,
                availableHeight: args.availableHeight,
              };
            },
          }),
        ],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      // After shift clamps x to 400: overflow.left -400, overflow.right 0 →
      // maximumClippingWidth = 100 - (-400) - 0 = 500 (not the 100 the
      // side-based min() would report).
      expect(applied!.availableWidth).toBe(500);
    });
  });

  describe("inline()", () => {
    const clientRect = (
      x: number,
      y: number,
      width: number,
      height: number,
    ) => ({
      x,
      y,
      width,
      height,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height,
    });

    it("no-ops on empty client rects instead of resetting to invalid values", async () => {
      // Pins the @floating-ui/core@1.8.0 fix: a hidden/detached reference (or
      // a collapsed range) yields zero client rects; the middleware must keep
      // the existing reference rect.
      const referenceRect = { x: 100, y: 100, width: 50, height: 50 };
      const floating = { width: 100, height: 50 };
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [inline()],
        platform: createMockPlatform(VIEWPORT, referenceRect, {
          getClientRects: () => [],
        }),
      } as any);

      expect(Number.isFinite(result.x)).toBe(true);
      expect(Number.isFinite(result.y)).toBe(true);
      expect(result.x).toBe(75);
      expect(result.y).toBe(150);
    });

    it("anchors to the bounding rect of same-line client rects", async () => {
      const referenceRect = { x: 100, y: 100, width: 40, height: 20 };
      const floating = { width: 100, height: 50 };
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [inline()],
        platform: createMockPlatform(VIEWPORT, referenceRect, {
          getClientRects: () => [
            clientRect(100, 100, 40, 20),
            clientRect(140, 100, 40, 20),
          ],
        }),
      } as any);

      // Both rects merge into one line rect (x=100, w=80, h=20): the floating
      // element centers on it (100 + 40 - 50 = 90) and drops below (y=120).
      expect(result.x).toBe(90);
      expect(result.y).toBe(120);
    });
  });

  describe("hide()", () => {
    const floating = { width: 100, height: 50 };

    it("reports referenceHidden when the reference is fully clipped", async () => {
      const result = await computePosition(
        { x: 600, y: 600, width: 50, height: 50 },
        floating,
        {
          placement: "bottom",
          middleware: [hide()],
          platform: createMockPlatform(VIEWPORT, {
            x: 600,
            y: 600,
            width: 50,
            height: 50,
          }),
        } as any,
      );

      expect(result.middlewareData.hide?.referenceHidden).toBe(true);
    });

    it("does not report referenceHidden while any part is visible", async () => {
      const referenceRect = { x: 225, y: 475, width: 50, height: 50 };
      const result = await computePosition(referenceRect, floating, {
        placement: "bottom",
        middleware: [hide()],
        platform: createMockPlatform(VIEWPORT, referenceRect),
      } as any);

      expect(result.middlewareData.hide?.referenceHidden).toBe(false);
    });
  });
});
