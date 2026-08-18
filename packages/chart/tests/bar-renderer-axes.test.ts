// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

describe("BarRenderer per-series axes", () => {
  it("maps each series through its own xAxisIndex/yAxisIndex scales, not the first series'", async () => {
    const createdBuffers: { id?: string; data: Float32Array }[] = [];
    const fakeDevice = {
      createBuffer: ({ data, id }: { data: Float32Array; id?: string }) => {
        const buffer = { data, id, destroy: () => {} };
        createdBuffers.push(buffer);
        return buffer;
      },
    };

    vi.doMock("@luma.gl/engine", () => ({
      Model: class {
        props: Record<string, unknown> = {};
        setAttributes(_attrs: unknown) {}
        setVertexCount(_count: number) {}
        setInstanceCount(_count: number) {}
        draw(_renderPass: unknown) {}
      },
    }));
    vi.resetModules();

    const { BarRenderer } = await import("../src/gl/BarRenderer.ts");
    const { createColorResolver } = await import("../src/gl/color.ts");

    const xPrimary = { map: (value: number) => value, bandwidth: () => 10 };
    // Secondary x-axis is offset by +100 so using the first series' scale
    // would place this bar at 5 instead of 105.
    const xSecondary = {
      map: (value: number) => value + 100,
      bandwidth: () => 10,
    };
    const yScale = { map: (value: number) => value, bandwidth: () => 0 };

    const renderer = new BarRenderer(fakeDevice as any);
    renderer.render(
      {} as any,
      [
        { type: "bar", name: "left", xAxisIndex: 0, yAxisIndex: 0, data: [4] },
        { type: "bar", name: "right", xAxisIndex: 1, yAxisIndex: 0, data: [5] },
      ] as any,
      [xPrimary, xSecondary] as any,
      [yScale] as any,
      { x: 0, y: 0, width: 200, height: 100 },
      200,
      100,
      0,
      createColorResolver({} as any),
    );

    vi.doUnmock("@luma.gl/engine");
    vi.resetModules();

    const buffer = createdBuffers.find((entry) => entry.id === "bar-instances");
    expect(buffer).toBeDefined();
    const instances = Array.from(buffer!.data);
    // Instance layout: [x, y, w, h, r, g, b, a, radius]
    const xLefts = [instances[0], instances[9]];
    expect(xLefts[0]).toBeLessThan(20);
    expect(xLefts[1]).toBeGreaterThan(90);
  });
});
