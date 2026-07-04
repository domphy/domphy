// Real-browser interaction check for directionAwareHover — enters the card
// from two different edges and asserts the image pan / overlay transform
// actually differ per entry direction (not a single static hover state),
// then resets on pointer-leave.
//
// Note: the resting styles are declared as *static* style objects (compiled
// to a CSS class by the framework), so `element.style.transform` reads back
// empty ("") until a pointer handler writes to it imperatively at least
// once — only the post-interaction values are ever literal inline styles.
// The browser also re-serializes those inline values (e.g. `translate(0, 0)`
// becomes `translate(0px, 0px)`), so assertions below compare against the
// normalized forms rather than the source's literal string constants.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NORMALIZED_RESTING_IMAGE_TRANSFORM = "scale(1) translate(0px, 0px)";
const NORMALIZED_OVERLAY_ENTERED_TRANSFORM = "translate(0px, 0px)";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "directionAwareHover");
    const rootLocator = await locate(page, "directionAwareHover");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const imageLocator = componentRoot.locator("> img");
    const overlayLocator = componentRoot.locator("> div");

    const box = await componentRoot.boundingBox();
    if (!box) {
      report("directionAwareHover bounds", false, "component root has no bounding box");
    } else {
      // Enter near the TOP-center edge.
      await page.mouse.move(box.x + box.width / 2, box.y - 40);
      await page.mouse.move(box.x + box.width / 2, box.y + 4);
      await page.waitForTimeout(150);
      const topImageTransform = await imageLocator.evaluate((el) => (el as HTMLElement).style.transform);
      const topOverlayTransform = await overlayLocator.evaluate((el) => (el as HTMLElement).style.transform);
      const topOverlayOpacity = await overlayLocator.evaluate((el) => (el as HTMLElement).style.opacity);

      report(
        "directionAwareHover top entry pans image and reveals overlay",
        topImageTransform !== NORMALIZED_RESTING_IMAGE_TRANSFORM &&
          topOverlayOpacity === "1" &&
          topOverlayTransform === NORMALIZED_OVERLAY_ENTERED_TRANSFORM,
        `top=${topImageTransform} overlayTransform=${topOverlayTransform} overlayOpacity=${topOverlayOpacity}`,
      );

      // Leave, then re-enter near the LEFT-center edge.
      await page.mouse.move(box.x - 60, box.y - 60);
      await page.waitForTimeout(150);

      await page.mouse.move(box.x - 40, box.y + box.height / 2);
      await page.mouse.move(box.x + 4, box.y + box.height / 2);
      await page.waitForTimeout(150);
      const leftImageTransform = await imageLocator.evaluate((el) => (el as HTMLElement).style.transform);

      report(
        "directionAwareHover left entry pans image differently than top entry",
        leftImageTransform !== topImageTransform && leftImageTransform !== NORMALIZED_RESTING_IMAGE_TRANSFORM,
        `top=${topImageTransform} left=${leftImageTransform}`,
      );

      // Leave again — image should return to the explicit resting transform.
      await page.mouse.move(box.x - 60, box.y - 60);
      await page.waitForTimeout(150);
      const finalTransform = await imageLocator.evaluate((el) => (el as HTMLElement).style.transform);
      report(
        "directionAwareHover resets image pan on pointer-leave",
        finalTransform === NORMALIZED_RESTING_IMAGE_TRANSFORM,
        `expected=${NORMALIZED_RESTING_IMAGE_TRANSFORM} final=${finalTransform}`,
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
