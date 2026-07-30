// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { cssColor } from "../src/gl/color.ts";
import { createTooltip } from "../src/overlay/tooltip.ts";
import type { TooltipParams } from "../src/types.ts";

function makeParams(overrides: Partial<TooltipParams>): TooltipParams {
  return {
    componentType: "series",
    seriesType: "bar",
    seriesIndex: 0,
    seriesName: "s1",
    name: "A",
    dataIndex: 0,
    data: null,
    value: 1,
    color: "#000",
    ...overrides,
  };
}

// Regression: seriesName/name/value are caller-controlled ChartOption data and were
// interpolated straight into el.innerHTML — an HTML/script injection sink.
describe("tooltip default formatter escapes caller-controlled data", () => {
  it("escapes HTML in seriesName before assigning to innerHTML", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, {});

    tooltip.update({
      visible: true,
      x: 0,
      y: 0,
      params: [
        makeParams({ seriesName: "<img src=x onerror=alert(1)>", value: 42 }),
      ],
    });

    const el = container.querySelector(".dc-tooltip")!;
    expect(el.querySelector("img")).toBeNull();
    expect(el.innerHTML).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(el.textContent).toContain("<img src=x onerror=alert(1)>");

    tooltip.destroy();
  });

  it("escapes HTML in a value produced by valueFormatter", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, {
      valueFormatter: () => "<script>alert(2)</script>",
    });

    tooltip.update({
      visible: true,
      x: 0,
      y: 0,
      params: [makeParams({})],
    });

    const el = container.querySelector(".dc-tooltip")!;
    expect(el.querySelector("script")).toBeNull();
    expect(el.innerHTML).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");

    tooltip.destroy();
  });
});

// Regression: a formatter returning a DomphyElement was coerced with String()
// and rendered as "[object Object]". It is now mounted imperatively.
describe("tooltip formatter returning a DomphyElement", () => {
  it("mounts the element into the tooltip instead of stringifying it", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, {
      formatter: () => ({ div: "custom tooltip content" }) as any,
    });

    tooltip.update({
      visible: true,
      x: 0,
      y: 0,
      params: [makeParams({})],
    });

    const el = container.querySelector(".dc-tooltip")!;
    expect(el.textContent).toContain("custom tooltip content");
    expect(el.innerHTML).not.toContain("[object Object]");

    // A subsequent update swaps the mounted element without leaking the old one.
    tooltip.update({
      visible: true,
      x: 0,
      y: 0,
      params: [makeParams({ value: 2 })],
    });
    expect(el.textContent).toContain("custom tooltip content");
    expect(el.querySelectorAll("div").length).toBe(1);

    tooltip.destroy();
  });

  it("applies className/backgroundColor/borderColor/padding/extraCssText options", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, {
      className: "my-tip",
      backgroundColor: "#112233",
      borderColor: "primary",
      padding: [4, 8],
      extraCssText: "letter-spacing:1px",
    });

    const el = container.querySelector(".dc-tooltip") as HTMLElement;
    expect(el.className).toBe("dc-tooltip my-tip");
    expect(el.style.cssText).toContain("padding: 4px 8px");
    expect(el.style.cssText).toContain("letter-spacing: 1px");
    // A bare ThemeFamily name becomes a var(--…) reference, not "primary".
    expect(el.style.cssText).toContain("var(--primary-");

    // The color mapping itself (family name → var(--…) reference, hex passes
    // through) is also asserted directly.
    expect(cssColor("#112233", 0)).toBe("#112233");
    expect(cssColor("primary", 0)).toMatch(/^var\(--primary-/);

    tooltip.destroy();
  });
});
