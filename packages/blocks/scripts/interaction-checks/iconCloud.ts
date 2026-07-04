// Real browser interaction checks for iconCloud (src/magicui/core/iconCloud.ts).
//
// Performs a real drag (mouse down/move/up) across the canvas and asserts
// the rendered pixel content actually differs afterward, plus that the
// canvas's own cursor style flips to "grabbing" while the drag is held —
// both only possible if the pointer handlers really rotated the sphere.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "iconCloud");
  await locate(page, "iconCloud");

  const canvas = page.locator('[data-block="iconCloud"] canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("iconCloud canvas has no bounding box");
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  const cursorAtRest = await canvas.evaluate((el) => (el as HTMLCanvasElement).style.cursor);

  const pixelsBeforeDrag = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  const cursorWhileDragging = await canvas.evaluate((el) => (el as HTMLCanvasElement).style.cursor);
  // Large, multi-step drag so the yaw/pitch delta is unmistakably real (not
  // just idle auto-rotation, which this build's default is slow at 0.003 rad/frame).
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(centerX + step * 15, centerY + step * 6);
  }
  await page.mouse.up();
  await page.waitForTimeout(150); // one more rAF settle after release

  const cursorAfterRelease = await canvas.evaluate((el) => (el as HTMLCanvasElement).style.cursor);
  const pixelsAfterDrag = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());

  report(
    "iconCloud: dragging the sphere flips the canvas cursor to grabbing then back to grab",
    cursorAtRest === "grab" && cursorWhileDragging === "grabbing" && cursorAfterRelease === "grab",
    `cursor rest=${cursorAtRest} dragging=${cursorWhileDragging} afterRelease=${cursorAfterRelease}`,
  );

  report(
    "iconCloud: a real drag actually changes the rendered sphere (canvas pixels differ)",
    pixelsBeforeDrag !== pixelsAfterDrag,
    pixelsBeforeDrag !== pixelsAfterDrag
      ? "canvas.toDataURL() differs before vs after drag"
      : "canvas pixel content identical before/after drag — rotation did not respond",
  );

  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
