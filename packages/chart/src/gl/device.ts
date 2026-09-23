import { type Device, luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";
import { showChartError } from "./chartError.js";

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
      // luma.gl's default ("errors") opens an in-browser debug overlay on a
      // shader/pipeline compile failure (@luma.gl/core Shader._displayShaderLog):
      // it injects a page-fixed `<div>` straight into `document.body`, with
      // static `id="copy"`/`id="close"` — a second chart on the page (or a
      // second failure from the same one) collides on those ids (confirmed via
      // axe-core duplicate-id-active in real Chromium). A library must not
      // inject debug DOM into a consumer's page, so turn the overlay off at
      // the source; the error itself is not silenced — see onError below.
      debugShaders: "never",
      // luma.gl already logs unhandled device/pipeline errors (Device.reportError
      // falls back to its own console.error when onError does not report the
      // error as handled), but with its own generic styling and no reference to
      // which chart failed. Report it through @domphy/chart's own error surface
      // instead: a prefixed console.error (matches the init-failure catch in
      // patch.ts) plus the same visible fallback message, so a shader/pipeline
      // error is never silent AND never invisible without devtools open.
      onError: (error: Error) => {
        console.error("@domphy/chart: WebGL rendering error.", error);
        showChartError(
          canvas.parentElement,
          "Chart rendering failed (WebGL error).",
        );
        return true; // handled — suppress luma.gl's own duplicate console.error
      },
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
