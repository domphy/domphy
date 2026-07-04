// Real-browser interaction check for `magneticButton`: hover near an edge of
// its wrapped child and assert the child's `transform` actually drifts toward
// the cursor via the `requestAnimationFrame` spring simulation, then springs
// back to none-ish on pointer-leave — see
// src/aceternity/buttons/magneticButton.ts.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

function parseTranslate(transform: string): { x: number; y: number } | null {
  // matrix(a, b, c, d, tx, ty) is what getComputedStyle reports for a plain translate().
  const match = transform.match(/^matrix\(([^)]+)\)$/);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 6) return null;
  return { x: parts[4], y: parts[5] };
}

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "magneticButton");
  const locator = await locate(page, "magneticButton");
  // `locator` is the whole demo card (label + content box) — the actual
  // magneticButton wrapper (and its own bounding box) is its rendered child.
  const wrapper = locator.locator(".block-box > div").first();
  const child = wrapper.locator("button").first();

  const baselineTransform = await child.evaluate((element) => getComputedStyle(element).transform);
  report(
    "magneticButton: child has no drift transform at rest",
    baselineTransform === "none",
    `baselineTransform=${baselineTransform}`,
  );

  // Hover near a corner (not dead-center) of the wrapper so the pointer's
  // offset-from-center is non-zero — the spring's target offset would
  // otherwise be (0, 0) even while actively tracking.
  const box = await wrapper.boundingBox();
  if (!box) throw new Error("magneticButton: could not measure bounding box");
  await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.92, { steps: 8 });
  // Let the rAF spring simulation step toward the pointer for a few frames.
  await page.waitForTimeout(250);
  const draggedTransform = await child.evaluate((element) => getComputedStyle(element).transform);
  const dragged = parseTranslate(draggedTransform);
  report(
    "magneticButton: hovering off-center drifts the child toward the cursor via a real transform",
    dragged !== null && (Math.abs(dragged.x) > 1 || Math.abs(dragged.y) > 1),
    `draggedTransform=${draggedTransform}`,
  );

  // Move the pointer off the wrapper entirely and let the spring settle back.
  await page.mouse.move(5, 5);
  await page.waitForTimeout(600);
  const settledTransform = await child.evaluate((element) => getComputedStyle(element).transform);
  const settled = parseTranslate(settledTransform);
  report(
    "magneticButton: pointer-leave springs the child back toward its rest position",
    settledTransform === "none" || (settled !== null && Math.abs(settled.x) < 1 && Math.abs(settled.y) < 1),
    `settledTransform=${settledTransform}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
