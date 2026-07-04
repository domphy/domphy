// Real browser interaction checks for pixelatedCanvas (src/aceternity/cards/pixelatedCanvas.ts).
//
// Moves the real mouse near the canvas's cells (default distortionMode
// "repel") and asserts the rendered pixel content actually changes while the
// cursor is nearby, then moves away and asserts the cells ease back toward
// their identical resting render — both only possible if the per-cell
// pointer-distance displacement is really being computed and drawn.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "pixelatedCanvas");
  await locate(page, "pixelatedCanvas");

  const canvas = page.locator('[data-block="pixelatedCanvas"] canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("pixelatedCanvas has no bounding box");

  // Establish a clean, pointer-absent baseline first.
  await page.mouse.move(box.x - 300, box.y - 300);
  await page.waitForTimeout(600);
  const restSnapshot = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());

  // Hover directly over the grid — well within the default 90px distortion radius.
  const hoverX = box.x + box.width * 0.35;
  const hoverY = box.y + box.height * 0.4;
  await page.mouse.move(hoverX, hoverY);
  await page.waitForTimeout(600); // pointer-smoothing lerp + per-cell offset easing settle
  const hoverSnapshot = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());

  report(
    "pixelatedCanvas: hovering near the grid actually distorts the rendered cells",
    hoverSnapshot !== restSnapshot,
    hoverSnapshot !== restSnapshot
      ? "canvas.toDataURL() differs at rest vs while hovering"
      : "canvas pixel content identical — pointer distortion did not render",
  );

  // Move back out and let the per-cell offsets ease back to their resting
  // position. The easing is an asymptotic 0.25-per-frame lerp toward zero —
  // it never reaches exactly zero in theory, but in practice needs ~2s to
  // fall under sub-pixel/anti-aliasing significance (verified empirically:
  // 900ms still left a measurable diff, 2s did not).
  await page.mouse.move(box.x - 300, box.y - 300);
  await page.waitForTimeout(2000);
  const settledSnapshot = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());

  report(
    "pixelatedCanvas: moving the pointer away eases cells back to their identical resting render",
    settledSnapshot === restSnapshot,
    settledSnapshot === restSnapshot
      ? "canvas render after pointer-leave matches the original resting render"
      : "canvas render did not return to its resting state after the pointer left",
  );

  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
