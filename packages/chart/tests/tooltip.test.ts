// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
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
