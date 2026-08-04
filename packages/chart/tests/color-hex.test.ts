// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createColorResolver, hexToRgba } from "../src/gl/color.ts";

// Regression: "#fff" (3-digit hex) used to parse as r=ff, g=f, b=NaN and the
// NaN went straight into WebGL uniforms, corrupting the draw. Short hex forms
// are now expanded, and unparseable colors fall back to the series palette on
// the uniform path.
describe("hexToRgba short-form expansion", () => {
  it("expands #rgb", () => {
    expect(hexToRgba("#fff")).toEqual([1, 1, 1, 1]);
    expect(hexToRgba("#f00")).toEqual([1, 0, 0, 1]);
  });

  it("expands #rgba", () => {
    expect(hexToRgba("#ff000080")).toEqual([1, 0, 0, 0x80 / 255]);
    expect(hexToRgba("#0f08")).toEqual([0, 1, 0, 0x88 / 255]);
  });

  it("keeps long forms and explicit alpha", () => {
    expect(hexToRgba("#ff8800")).toEqual([1, 0x88 / 255, 0, 1]);
    expect(hexToRgba("#ff8800", 0.5)).toEqual([1, 0x88 / 255, 0, 0.5]);
  });
});

describe("ColorResolver.rgba NaN guards", () => {
  function resolver() {
    const el = document.createElement("div");
    document.body.appendChild(el);
    return createColorResolver(el);
  }

  it("never returns NaN for invalid hex — falls back to the series palette", () => {
    const rgba = resolver().rgba("#zzzzzz", 2);
    expect(rgba.some((c) => Number.isNaN(c))).toBe(false);
    // Palette fallback for index 2 (static light-theme family color).
    expect(rgba).toEqual(resolver().rgba(undefined, 2));
  });

  it("never returns NaN for unparseable rgb() strings", () => {
    const rgba = resolver().rgba("rgb(not, a, color)", 0);
    expect(rgba.some((c) => Number.isNaN(c))).toBe(false);
  });

  it("resolves valid short hex", () => {
    expect(resolver().rgba("#fff", 0)).toEqual([1, 1, 1, 1]);
  });
});
