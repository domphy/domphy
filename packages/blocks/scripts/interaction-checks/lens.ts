// Real browser interaction checks for lens (src/magicui/core/lens.ts).
//
// Moves the real mouse over the magnified content at two distinct
// coordinates and reads the lens overlay's own inline `transform`,
// asserting it actually follows the cursor (per the documented
// `translate(x - radius, y - radius)` formula) rather than just becoming
// visible.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

function parseTranslate(transform: string): { x: number; y: number } | null {
  const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "lens");
  await locate(page, "lens");

  const baseContent = page.locator('[data-block="lens"] [data-lens-content="true"]');
  const overlay = page.locator('[data-block="lens"] [data-lens-overlay="true"]');
  const box = await baseContent.boundingBox();
  if (!box) throw new Error("lens base content has no bounding box");
  const lensRadius = await overlay.evaluate((el) => (el as HTMLElement).offsetWidth / 2);

  const opacityOutside = await overlay.evaluate((el) => getComputedStyle(el).opacity);

  const pointA = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.3 };
  await page.mouse.move(pointA.x, pointA.y);
  await page.waitForTimeout(150); // CSS transition settle (duration 0.1s + margin)
  const [opacityInside, transformA] = await Promise.all([
    overlay.evaluate((el) => getComputedStyle(el).opacity),
    overlay.evaluate((el) => (el as HTMLElement).style.transform),
  ]);
  const resultA = parseTranslate(transformA);

  const pointB = { x: box.x + box.width * 0.7, y: box.y + box.height * 0.65 };
  await page.mouse.move(pointB.x, pointB.y, { steps: 3 });
  await page.waitForTimeout(150);
  const transformB = await overlay.evaluate((el) => (el as HTMLElement).style.transform);
  const resultB = parseTranslate(transformB);

  report(
    "lens: hovering the content fades in the magnifier overlay",
    opacityOutside === "0" && opacityInside === "1",
    `opacity outside=${opacityOutside} inside=${opacityInside}`,
  );

  const expectedA = { x: pointA.x - box.x - lensRadius, y: pointA.y - box.y - lensRadius };
  const expectedB = { x: pointB.x - box.x - lensRadius, y: pointB.y - box.y - lensRadius };
  const withinTolerance = (actual: number, expected: number, tolerancePx: number) =>
    Math.abs(actual - expected) <= tolerancePx;
  const matchesA =
    !!resultA && withinTolerance(resultA.x, expectedA.x, 2) && withinTolerance(resultA.y, expectedA.y, 2);
  const matchesB =
    !!resultB && withinTolerance(resultB.x, expectedB.x, 2) && withinTolerance(resultB.y, expectedB.y, 2);

  report(
    "lens: overlay's transform follows the cursor's real coordinates at two different points",
    matchesA && matchesB && !!resultA && !!resultB && (resultA.x !== resultB.x || resultA.y !== resultB.y),
    `pointA expected=${JSON.stringify(expectedA)} got=${JSON.stringify(resultA)}; pointB expected=${JSON.stringify(expectedB)} got=${JSON.stringify(resultB)}`,
  );

  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
