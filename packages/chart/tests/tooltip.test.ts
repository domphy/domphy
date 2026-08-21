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

// Regression: the series color was interpolated into the marker's inline
// style attribute unescaped — a color string containing a double quote could
// terminate the attribute and inject new attributes (author-provided, so
// cosmetic, but defense in depth).
describe("tooltip default formatter escapes the series color", () => {
  it("escapes quotes in p.color so the style attribute cannot be broken out of", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, {});

    tooltip.update({
      visible: true,
      x: 0,
      y: 0,
      params: [makeParams({ color: 'red" onmouseover="alert(1)' })],
    });

    const el = container.querySelector(".dc-tooltip")!;
    const markers = el.querySelectorAll("span");
    // The breakout attempt must not parse as a real attribute, and no extra
    // elements may appear.
    expect(markers.length).toBe(1);
    expect(markers[0].getAttribute("onmouseover")).toBeNull();
    expect(el.innerHTML).toContain("&quot;");

    tooltip.destroy();
  });
});

// ECharts label preference: an item-trigger tooltip names the row after the
// item itself (a pie slice reads "Books: 300", not the series name); an
// axis-trigger tooltip names each row after its series.
describe("tooltip default formatter label preference", () => {
  it("prefers the item name over seriesName for item-trigger tooltips", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, { trigger: "item" });

    tooltip.update({
      visible: true,
      x: 0,
      y: 0,
      params: [makeParams({ seriesName: "Sales", name: "Books", value: 300 })],
    });

    const el = container.querySelector(".dc-tooltip")!;
    expect(el.querySelector("strong")!.textContent).toBe("Books");

    tooltip.destroy();
  });

  it("keeps seriesName as the row label for axis-trigger tooltips", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, { trigger: "axis" });

    tooltip.update({
      visible: true,
      x: 0,
      y: 0,
      params: [makeParams({ seriesName: "Sales", name: "Mon", value: 120 })],
    });

    const el = container.querySelector(".dc-tooltip")!;
    expect(el.querySelector("strong")!.textContent).toBe("Sales");

    tooltip.destroy();
  });

  it("falls back to seriesName when the item has no name", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, { trigger: "item" });

    tooltip.update({
      visible: true,
      x: 0,
      y: 0,
      params: [makeParams({ seriesName: "Sales", name: undefined as any })],
    });

    const el = container.querySelector(".dc-tooltip")!;
    expect(el.querySelector("strong")!.textContent).toBe("Sales");

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

  // ECharts semantics render a string formatter result as HTML, but the string
  // commonly embeds caller data — run the same sanitizeHTMLString pass core's
  // rawHtml() applies (script elements, on* handlers, javascript: URLs).
  it("sanitizes a string formatter result before assigning innerHTML", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, {
      formatter: () =>
        '<b>ok</b><script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">x</a>',
    });

    tooltip.update({
      visible: true,
      x: 0,
      y: 0,
      params: [makeParams({})],
    });

    const el = container.querySelector(".dc-tooltip")!;
    expect(el.querySelector("b")?.textContent).toBe("ok");
    expect(el.querySelector("script")).toBeNull();
    expect(el.querySelector("img")?.getAttribute("onerror")).toBeNull();
    expect(el.querySelector("a")?.getAttribute("href") ?? "").not.toContain(
      "javascript:",
    );

    tooltip.destroy();
  });
});

// Regression: tooltip.appendToBody was typed and listed on the option surface
// but createTooltip always parented into the chart container, so overflow:hidden
// (on the host or an ancestor) clipped it. appendToBody mounts on document.body.
describe("tooltip appendToBody", () => {
  it("appends the tooltip to document.body and uses position:fixed", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, { appendToBody: true });

    expect(container.querySelector(".dc-tooltip")).toBeNull();
    const el = document.body.querySelector(
      ":scope > .dc-tooltip",
    ) as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.parentElement).toBe(document.body);
    expect(el.style.position).toBe("fixed");

    tooltip.destroy();
    expect(document.body.querySelector(":scope > .dc-tooltip")).toBeNull();
  });

  it("still parents into the chart container when appendToBody is unset", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const tooltip = createTooltip(container, {});

    const el = container.querySelector(".dc-tooltip") as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.parentElement).toBe(container);
    expect(el.style.position).toBe("absolute");
    expect(document.body.querySelector(":scope > .dc-tooltip")).toBeNull();

    tooltip.destroy();
  });
});
