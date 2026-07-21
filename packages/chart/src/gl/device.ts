import { type Device, luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";

luma.registerAdapters([webgl2Adapter]);

const deviceCache = new WeakMap<HTMLCanvasElement, Promise<Device>>();

export async function getDevice(canvas: HTMLCanvasElement): Promise<Device> {
  let promise = deviceCache.get(canvas);
  if (!promise) {
    promise = luma.createDevice({
      type: "webgl",
      createCanvasContext: { canvas, antialias: true } as any,
    });
    deviceCache.set(canvas, promise);
  }
  return promise;
}

export function releaseDevice(canvas: HTMLCanvasElement): void {
  const promise = deviceCache.get(canvas);
  deviceCache.delete(canvas);
  promise?.then((device) => device.destroy()).catch(() => {});
}
