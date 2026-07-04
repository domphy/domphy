// Real browser check for globe3D (hand-rolled WebGL1 textured Earth): drag
// the canvas and assert rotation actually responds, and wheel-zoom and
// assert the camera distance actually responds — both verified by comparing
// rendered pixel content before/after (this component recomputes its canvas
// backing-store size from `container.clientWidth` every frame, so — unlike
// magicui/core/globe.ts's `cobe` integration — it renders correctly in this
// headless environment; a real screenshot pixel-diff is meaningful here).
import { boot, locate, mountedPage, pixelSnapshot, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "globe3D";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);
    const canvas = block.locator("canvas");
    await canvas.waitFor({ state: "attached", timeout: 5000 });
    await page.waitForTimeout(600);

    const box = await canvas.boundingBox();
    if (!box) throw new Error("globe3D canvas has no bounding box");
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const beforeDrag = await pixelSnapshot(page, canvas);

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    for (const dx of [40, 90, 150, 220, 300, 380]) {
      await page.mouse.move(centerX + dx, centerY);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);

    const afterDrag = await pixelSnapshot(page, canvas);
    report(
      `${NAME}: dragging orbits the camera (rendered pixels changed)`,
      !beforeDrag.equals(afterDrag),
      `before=${beforeDrag.length} bytes, after=${afterDrag.length} bytes`,
    );

    const beforeZoom = await pixelSnapshot(page, canvas);
    await page.mouse.move(centerX, centerY);
    // A large, real wheel gesture — negative deltaY zooms in (see the
    // component's `handleWheel`: `distance = clamp(distance + deltaY*0.0025, ...)`).
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(300);
    const afterZoomIn = await pixelSnapshot(page, canvas);
    report(
      `${NAME}: wheel-zoom actually changes the camera distance (rendered pixels changed)`,
      !beforeZoom.equals(afterZoomIn),
      `before=${beforeZoom.length} bytes, after=${afterZoomIn.length} bytes`,
    );

    // Zoom back out and confirm it responds the other direction too, not
    // just clamped/stuck at a zoom limit.
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(300);
    const afterZoomOut = await pixelSnapshot(page, canvas);
    report(
      `${NAME}: wheel-zoom is reversible (zooming back out changes pixels again)`,
      !afterZoomIn.equals(afterZoomOut),
      `zoomedIn=${afterZoomIn.length} bytes, zoomedOut=${afterZoomOut.length} bytes`,
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
