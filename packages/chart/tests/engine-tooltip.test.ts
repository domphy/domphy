// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { ChartEngine } from "../src/engine.ts";
import type { ChartOption } from "../src/types.ts";

// setOption() rebinds tooltip mousemove/mouseleave listeners every call. Regression
// for a leak where the previous pair was never removed before the new pair was bound.
describe("ChartEngine tooltip listener lifecycle", () => {
  it("removes the previous mousemove/mouseleave pair on every setOption() call, not just on destroy()", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const addSpy = new Map<string, number>();
    const removeSpy = new Map<string, number>();
    const originalAdd = container.addEventListener.bind(container);
    const originalRemove = container.removeEventListener.bind(container);
    container.addEventListener = ((type: string, ...rest: any[]) => {
      addSpy.set(type, (addSpy.get(type) ?? 0) + 1);
      return originalAdd(type, ...(rest as [any, any]));
    }) as typeof container.addEventListener;
    container.removeEventListener = ((type: string, ...rest: any[]) => {
      removeSpy.set(type, (removeSpy.get(type) ?? 0) + 1);
      return originalRemove(type, ...(rest as [any, any]));
    }) as typeof container.removeEventListener;

    const engine = new ChartEngine(container);
    engine.setSize(400, 300);

    const option: ChartOption = {
      series: [{ type: "bar", name: "s1", data: [1, 2, 3] }],
    };

    // setOption() re-binds tooltip events on every call (reactive option updates, resize, etc).
    for (let i = 0; i < 5; i++) engine.setOption(option);

    // Each rebind must remove its predecessor's listeners before adding new ones —
    // otherwise mousemove/mouseleave listener counts grow unboundedly.
    expect(addSpy.get("pointermove")).toBe(5);
    expect(removeSpy.get("pointermove")).toBe(4);
    expect(addSpy.get("pointerleave")).toBe(5);
    expect(removeSpy.get("pointerleave")).toBe(4);

    engine.destroy();

    expect(removeSpy.get("pointermove")).toBe(5);
    expect(removeSpy.get("pointerleave")).toBe(5);
  });
});

// Regression: createTooltip honors appendToBody (document.body + position:fixed)
// but setOption used to warn it as unimplemented because it sat in
// UNSUPPORTED_TOOLTIP_KEYS. confine is the same class of implemented key.
describe("ChartEngine tooltip.appendToBody", () => {
  it("does not warn that appendToBody is unimplemented", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const container = document.createElement("div");
    document.body.appendChild(container);
    const engine = new ChartEngine(container);
    engine.setSize(400, 300);

    engine.setOption({
      tooltip: { appendToBody: true },
      series: [{ type: "bar", name: "s1", data: [1, 2, 3] }],
    });

    expect(
      warn.mock.calls.some((call) =>
        String(call[0]).includes("option.tooltip.appendToBody"),
      ),
    ).toBe(false);

    engine.destroy();
    warn.mockRestore();
  });
});
