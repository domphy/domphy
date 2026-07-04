// Real browser interaction checks for pointer (src/magicui/core/pointer.ts).
//
// Moves the real mouse over the trigger zone at two distinct coordinates and
// reads the custom cursor element's own `transform` after each, asserting it
// actually tracks the live cursor position (not just a static "visible" flag).
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

function parseTranslate(transform: string): { x: number; y: number } | null {
  const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "pointer");
  await locate(page, "pointer");

  // Scope to the block's own rendered wrapper (`.block-box`'s first child),
  // not the demo card shell around it (which also includes the `<h2>`
  // heading above it) — mousemove coordinates are computed by pointer.ts
  // relative to that inner wrapper's own `getBoundingClientRect()`.
  const container = page.locator('[data-block="pointer"] .block-box > div').first();
  const cursorElement = container.locator('[data-pointer-cursor="true"]');
  const box = await container.boundingBox();
  if (!box) throw new Error("pointer container has no bounding box");

  const opacityOutside = await cursorElement.evaluate((el) => getComputedStyle(el).opacity);

  // First point: near the top-left of the zone.
  const pointA = { x: box.x + box.width * 0.25, y: box.y + box.height * 0.3 };
  await page.mouse.move(pointA.x, pointA.y);
  await page.waitForTimeout(200); // lerp-smoothing settle (default smoothing 0.25/frame)
  const [opacityInside, transformA] = await Promise.all([
    cursorElement.evaluate((el) => getComputedStyle(el).opacity),
    cursorElement.evaluate((el) => (el as HTMLElement).style.transform),
  ]);
  const pointAResult = parseTranslate(transformA);

  // Second point: a clearly different spot within the same zone.
  const pointB = { x: box.x + box.width * 0.75, y: box.y + box.height * 0.7 };
  await page.mouse.move(pointB.x, pointB.y, { steps: 5 });
  await page.waitForTimeout(300);
  const transformB = await cursorElement.evaluate((el) => (el as HTMLElement).style.transform);
  const pointBResult = parseTranslate(transformB);

  report(
    "pointer: entering the zone fades in the custom cursor and hides the native one",
    opacityOutside === "0" && opacityInside === "1",
    `opacity outside=${opacityOutside} inside=${opacityInside}`,
  );

  const offset = { x: 16, y: 16 }; // DEFAULT_OFFSET
  const withinTolerance = (actual: number, expected: number, tolerancePx: number) =>
    Math.abs(actual - expected) <= tolerancePx;

  const pointAMatches =
    !!pointAResult &&
    withinTolerance(pointAResult.x, pointA.x - box.x + offset.x, 6) &&
    withinTolerance(pointAResult.y, pointA.y - box.y + offset.y, 6);
  const pointBMatches =
    !!pointBResult &&
    withinTolerance(pointBResult.x, pointB.x - box.x + offset.x, 6) &&
    withinTolerance(pointBResult.y, pointB.y - box.y + offset.y, 6);

  report(
    "pointer: custom cursor's transform follows real cursor coordinates at two different points",
    pointAMatches && pointBMatches && !!pointAResult && !!pointBResult && (pointAResult.x !== pointBResult.x || pointAResult.y !== pointBResult.y),
    `pointA target=(${pointA.x - box.x + offset.x},${pointA.y - box.y + offset.y}) got=${JSON.stringify(pointAResult)}; pointB target=(${pointB.x - box.x + offset.x},${pointB.y - box.y + offset.y}) got=${JSON.stringify(pointBResult)}`,
  );

  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
