// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ChartEngine } from "../src/engine.ts";

describe("ChartEngine.init() destroyed race", () => {
  it("does not attach renderers when destroy() wins the getDevice race", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const engine = new ChartEngine(container);
    engine.destroy();
    // Simulates getDevice resolving after destroy() — the same branch
    // init() takes after `await getDevice`.
    (engine as any).finishInit({ id: "late-device" });

    expect((engine as any).device).toBeNull();
    expect((engine as any).barRenderer).toBeNull();
    expect((engine as any).pieRenderer).toBeNull();
    expect(container.children.length).toBe(0);
  });
});
