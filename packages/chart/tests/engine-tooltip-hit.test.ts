// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ChartEngine } from "../src/engine.ts";

function makeEngine(width = 400, height = 300): ChartEngine {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const engine = new ChartEngine(container);
  (engine as any).device = {
    beginRenderPass: () => ({ end() {} }),
    submit() {},
  };
  engine.setSize(width, height);
  return engine;
}

function hover(container: HTMLElement, x: number, y: number) {
  container.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ChartEngine tooltip hits", () => {
  it("pie default item trigger fires on the right-hand slice", () => {
    const engine = makeEngine();
    engine.setOption({
      series: [
        {
          type: "pie",
          name: "Sales",
          data: [
            { name: "Books", value: 1 },
            { name: "Games", value: 1 },
          ],
        },
      ],
    });
    const container = (engine as any).container as HTMLElement;
    hover(container, 250, 150);
    const tip = container.querySelector<HTMLElement>(".dc-tooltip")!;
    expect(tip.style.opacity).toBe("1");
    expect(tip.textContent).toContain("Books");
    engine.destroy();
  });

  it("item-trigger line hits the mapped point", () => {
    const engine = makeEngine();
    engine.setOption({
      tooltip: { trigger: "item" },
      xAxis: { type: "value", min: 0, max: 100 },
      yAxis: { type: "value", min: 0, max: 100 },
      series: [{ type: "line", name: "Trend", data: [[50, 50]] }],
    });
    const container = (engine as any).container as HTMLElement;
    hover(container, 220, 145);
    const tip = container.querySelector<HTMLElement>(".dc-tooltip")!;
    expect(tip.style.opacity).toBe("1");
    expect(tip.textContent).toMatch(/Trend|50/);
    engine.destroy();
  });
});
