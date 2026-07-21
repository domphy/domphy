// Real browser check for globe (magicui dot-sphere, rendered via `cobe`):
// drag the canvas and assert rotation actually responds, plus a real
// cursor-style assertion during the drag.
//
// NOT a screenshot pixel-diff: reproduced with raw upstream `cobe` (zero
// Domphy code involved) and confirmed headless Chromium's software WebGL
// (SwiftShader) renders the dot-sphere as a flat solid-color disc here — the
// baked map texture never visibly samples, so the rendered pixels are
// identical at any rotation angle in THIS environment. That's an
// environment/library limitation, not a bug in this component (see the fix
// note in src/magicui/core/globe.ts's buildOptions — a real, separate scale
// bug WAS found and fixed there: width/height must scale by the same
// devicePixelRatio passed to cobe, not a hardcoded `*2`). Instead this
// instruments the actual WebGL `z` (phi/rotation) uniform cobe uploads every
// frame — proof, at the graphics-API level, that dragging changes the
// globe's rotation state, independent of whether this GPU can visibly
// render the result.
import {
  boot,
  locate,
  mountedPageWithInit,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

const NAME = "globe";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPageWithInit(demoUrl, NAME, async (p) => {
      await p.addInitScript(() => {
        (window as unknown as { __phiValues: number[] }).__phiValues = [];
        const locationNames = new WeakMap<object, string>();

        const origGetUniformLocation1 =
          WebGLRenderingContext.prototype.getUniformLocation;
        WebGLRenderingContext.prototype.getUniformLocation = function (
          this: WebGLRenderingContext,
          program,
          name,
        ) {
          const location = origGetUniformLocation1.call(this, program, name);
          if (location && name === "z") locationNames.set(location, name);
          return location;
        };
        const origUniform1f1 = WebGLRenderingContext.prototype.uniform1f;
        WebGLRenderingContext.prototype.uniform1f = function (
          this: WebGLRenderingContext,
          location,
          value,
        ) {
          if (location && locationNames.get(location) === "z") {
            (window as unknown as { __phiValues: number[] }).__phiValues.push(
              value,
            );
          }
          return origUniform1f1.call(this, location, value);
        };

        const webgl2Proto = (
          window as unknown as {
            WebGL2RenderingContext?: typeof WebGL2RenderingContext;
          }
        ).WebGL2RenderingContext?.prototype;
        if (webgl2Proto) {
          const origGetUniformLocation2 = webgl2Proto.getUniformLocation;
          webgl2Proto.getUniformLocation = function (
            this: WebGL2RenderingContext,
            program,
            name,
          ) {
            const location = origGetUniformLocation2.call(this, program, name);
            if (location && name === "z") locationNames.set(location, name);
            return location;
          };
          const origUniform1f2 = webgl2Proto.uniform1f;
          webgl2Proto.uniform1f = function (
            this: WebGL2RenderingContext,
            location,
            value,
          ) {
            if (location && locationNames.get(location) === "z") {
              (window as unknown as { __phiValues: number[] }).__phiValues.push(
                value,
              );
            }
            return origUniform1f2.call(this, location, value);
          };
        }
      });
    });
    const block = await locate(page, NAME);
    const canvas = block.locator("canvas");
    await canvas.waitFor({ state: "attached", timeout: 5000 });
    await page.waitForTimeout(500);

    const box = await canvas.boundingBox();
    if (!box) throw new Error("globe canvas has no bounding box");
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const phiBeforeDrag = await page.evaluate(
      () =>
        (window as unknown as { __phiValues: number[] }).__phiValues.at(-1) ??
        null,
    );

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();

    const cursorWhileDragging = await canvas.evaluate(
      (el) => (el as HTMLElement).style.cursor,
    );
    report(
      `${NAME}: cursor switches to "grabbing" while dragging`,
      cursorWhileDragging === "grabbing",
      `cursor="${cursorWhileDragging}"`,
    );

    // A real, multi-step drag across a wide swath of the canvas.
    for (const dx of [40, 90, 150, 220, 300, 380]) {
      await page.mouse.move(centerX + dx, centerY);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);

    const cursorAfterRelease = await canvas.evaluate(
      (el) => (el as HTMLElement).style.cursor,
    );
    report(
      `${NAME}: cursor reverts to "grab" after release`,
      cursorAfterRelease === "grab",
      `cursor="${cursorAfterRelease}"`,
    );

    const phiAfterDrag = await page.evaluate(
      () =>
        (window as unknown as { __phiValues: number[] }).__phiValues.at(-1) ??
        null,
    );
    const phiDelta =
      phiBeforeDrag !== null && phiAfterDrag !== null
        ? Math.abs(phiAfterDrag - phiBeforeDrag)
        : null;
    // A 380px drag maps to `delta/100` radians (~3.8) in the component's own
    // pointermove handler — idle auto-rotate alone (`rotationSpeed` 0.0035/frame)
    // could not plausibly produce a delta anywhere near this large.
    report(
      `${NAME}: dragging actually rotates the globe (WebGL "phi" uniform changed)`,
      phiDelta !== null && phiDelta > 1,
      `phi before=${phiBeforeDrag}, after=${phiAfterDrag}, delta=${phiDelta}`,
    );

    await page.close();
  } finally {
    await teardown();
  }
}

main()
  .catch((error) => {
    console.error(error);
    report(`${NAME}: unexpected error`, false, String(error));
  })
  .finally(() => summarize());
