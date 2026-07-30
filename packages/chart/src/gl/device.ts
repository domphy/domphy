import { type Device, luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";

// Adapter registration is lazy and idempotent so this module stays free of
// top-level side effects: package.json declares "sideEffects": false, and a
// top-level registerAdapters() call would either be dropped by tree-shaking
// (breaking the browser runtime) or run at import time in SSR (where no WebGL
// adapter is wanted). Registration happens on the first getDevice() call,
// which only ever runs in the browser.
let adaptersRegistered = false;

function ensureAdaptersRegistered(): void {
  if (adaptersRegistered) return;
  adaptersRegistered = true;
  luma.registerAdapters([webgl2Adapter]);
}

const deviceCache = new WeakMap<HTMLCanvasElement, Promise<Device>>();

export async function getDevice(canvas: HTMLCanvasElement): Promise<Device> {
  ensureAdaptersRegistered();
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
