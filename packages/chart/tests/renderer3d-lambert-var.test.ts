// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createColorResolver } from "../src/gl/color.ts";
import { renderGrid3D } from "../src/gl/Renderer3D.ts";
import type { Bar3DSeriesOption, Surface3DSeriesOption } from "../src/types.ts";

// Regression: `itemStyle.color: "primary"` (a ThemeFamily name) resolves to a
// `var(--…)` CSS reference for SVG paint, which shadeCssColor cannot multiply
// (no literal channels to read). Before this fix, lambert shading on such a
// series fell back to a `filter: brightness(k)` CSS approximation instead of
// a real shaded color. The fix threads the engine's per-pass ColorResolver
// (which reads the SAME custom property through getComputedStyle) into
// renderGrid3D so the shaded color is a literal rgb(...), same as it already
// was for a literal hex/rgb itemStyle.color.
function makeSvg(): { svg: SVGSVGElement; container: HTMLDivElement } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
  container.appendChild(svg);
  return { svg, container };
}

describe("renderGrid3D — lambert shading resolves var(--…) colors to a literal rgb(), not a CSS filter", () => {
  it("bar3D: itemStyle.color as a ThemeFamily name shades to a literal rgb() line stroke", () => {
    const { svg, container } = makeSvg();
    const colorResolver = createColorResolver(container);
    const bar3D: Bar3DSeriesOption[] = [
      {
        type: "bar3D",
        shading: "lambert",
        itemStyle: { color: "primary" },
        data: [[0, 0, 5]],
      } as Bar3DSeriesOption,
    ];
    renderGrid3D(
      svg,
      [{}],
      [],
      [],
      [],
      [],
      bar3D,
      [],
      [],
      400,
      300,
      colorResolver,
    );
    // Exclude the box wireframe's own `<line>` edges (stroke "#888", drawn
    // before any series) — the bar3D data line is the only OTHER one.
    const line = Array.from(svg.querySelectorAll(".dc-3d line")).find(
      (el) => el.getAttribute("stroke") !== "#888",
    );
    expect(line).not.toBeUndefined();
    const stroke = line?.getAttribute("stroke") ?? "";
    expect(stroke.startsWith("rgb(")).toBe(true);
    expect(stroke.startsWith("var(")).toBe(false);
    // No CSS filter fallback: the shading is a real multiplied color.
    expect(line?.getAttribute("style")).toBeNull();
  });

  it("surface3D: a ThemeFamily itemStyle.color shades to a literal rgb() quad fill", () => {
    const { svg, container } = makeSvg();
    const colorResolver = createColorResolver(container);
    const surface3D: Surface3DSeriesOption[] = [
      {
        type: "surface3D",
        shading: "lambert",
        shapeW: 2,
        shapeH: 2,
        itemStyle: { color: "success" },
        data: [
          [0, 0, 1],
          [1, 0, 2],
          [0, 1, 1],
          [1, 1, 3],
        ],
      } as Surface3DSeriesOption,
    ];
    renderGrid3D(
      svg,
      [{}],
      [],
      [],
      [],
      [],
      [],
      [],
      surface3D,
      400,
      300,
      colorResolver,
    );
    const path = svg.querySelector(".dc-3d path");
    expect(path).not.toBeNull();
    const fill = path?.getAttribute("fill") ?? "";
    expect(fill.startsWith("rgb(")).toBe(true);
    expect(fill.startsWith("var(")).toBe(false);
    expect(path?.getAttribute("style")).toBeNull();
  });
});
