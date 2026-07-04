// Real-browser interaction check for gradientAnimation — moves the cursor
// across the ambient background and asserts the pointer-follow blob's own
// `transform` actually tracks live cursor coordinates (rAF-lerped toward the
// pointer position), not a static/CSS-only keyframe loop.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "gradientAnimation");
    const rootLocator = await locate(page, "gradientAnimation");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const pointerBlobLocator = componentRoot.locator('[data-gradient-pointer-blob="true"]');

    const box = await componentRoot.boundingBox();
    if (!box) {
      report("gradientAnimation bounds", false, "component root has no bounding box");
    } else {
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25, { steps: 8 });
      // The pointer-follow blob eases toward the cursor at a 0.12 lerp rate
      // per animation frame — give it enough frames to converge close to
      // the target (0.88^60 ≈ 0.0004).
      await page.waitForTimeout(800);
      const transformAtA = await pointerBlobLocator.evaluate((el) => (el as HTMLElement).style.transform);

      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75, { steps: 8 });
      await page.waitForTimeout(800);
      const transformAtB = await pointerBlobLocator.evaluate((el) => (el as HTMLElement).style.transform);

      report(
        "gradientAnimation pointer blob transform differs at two cursor positions",
        transformAtA !== "" && transformAtB !== "" && transformAtA !== transformAtB,
        `at 25%,25%: ${transformAtA} — at 75%,75%: ${transformAtB}`,
      );

      const parseTranslate = (transform: string) => {
        const match = transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
        return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
      };
      const pointA = parseTranslate(transformAtA);
      const pointB = parseTranslate(transformAtB);
      report(
        "gradientAnimation pointer blob moved toward bottom-right as cursor did",
        !!pointA && !!pointB && pointB.x > pointA.x && pointB.y > pointA.y,
        `A=${JSON.stringify(pointA)} B=${JSON.stringify(pointB)}`,
      );
    }

    await page.close();
  } finally {
    await teardown();
  }
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
