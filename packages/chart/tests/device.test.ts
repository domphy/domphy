import { describe, expect, it, vi } from "vitest";

// Regression: releaseDevice() used to only drop the cached Promise<Device> from the
// WeakMap without ever calling Device.destroy(), leaking the WebGL context on teardown.
describe("releaseDevice", () => {
  it("destroys the Device created for that canvas, not just uncaching it", async () => {
    const destroy = vi.fn();
    vi.doMock("@luma.gl/core", () => ({
      luma: {
        registerAdapters: vi.fn(),
        createDevice: vi.fn(async () => ({ destroy })),
      },
    }));
    vi.doMock("@luma.gl/webgl", () => ({ webgl2Adapter: {} }));

    const { getDevice, releaseDevice } = await import("../src/gl/device.ts");
    const canvas = {} as HTMLCanvasElement;

    await getDevice(canvas);
    releaseDevice(canvas);
    // destroy() runs off the resolved device promise — flush microtasks.
    await Promise.resolve();
    await Promise.resolve();

    expect(destroy).toHaveBeenCalledTimes(1);

    vi.doUnmock("@luma.gl/core");
    vi.doUnmock("@luma.gl/webgl");
    vi.resetModules();
  });
});
