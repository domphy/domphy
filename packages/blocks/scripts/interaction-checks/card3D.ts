// Real-browser interaction check for card3D — moves the cursor across
// several points inside the card and asserts the inner card-body's
// `transform` (rotateX/rotateY) actually changes with cursor position, then
// resets to flat on pointer-leave.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "card3D");
    const rootLocator = await locate(page, "card3D");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const bodyLocator = componentRoot.locator("> div").first();

    const box = await componentRoot.boundingBox();
    if (!box) {
      report("card3D bounds", false, "card3D root has no bounding box");
    } else {
      // Move to top-left quadrant of the card, well inside its bounds.
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.15, { steps: 8 });
      const transformTopLeft = await bodyLocator.evaluate((el) => getComputedStyle(el).transform);

      // Move to bottom-right quadrant.
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.85, { steps: 8 });
      const transformBottomRight = await bodyLocator.evaluate((el) => getComputedStyle(el).transform);

      report(
        "card3D tilts differently at opposite corners",
        transformTopLeft !== "none" && transformBottomRight !== "none" && transformTopLeft !== transformBottomRight,
        `top-left=${transformTopLeft} bottom-right=${transformBottomRight}`,
      );

      // Move to dead center — rotation should be near-zero (small numeric jitter
      // aside), distinct from the corner readings above.
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 8 });
      const transformCenter = await bodyLocator.evaluate((el) => getComputedStyle(el).transform);
      report(
        "card3D center reading differs from corner readings",
        transformCenter !== transformTopLeft && transformCenter !== transformBottomRight,
        `center=${transformCenter}`,
      );

      // Leave the card — should ease back to the flat resting transform.
      await page.mouse.move(box.x - 50, box.y - 50, { steps: 5 });
      await page.waitForTimeout(400);
      const transformAfterLeave = await bodyLocator.evaluate((el) => getComputedStyle(el).transform);
      report(
        "card3D resets to flat on pointer-leave",
        transformAfterLeave === "none" || transformAfterLeave === "matrix(1, 0, 0, 1, 0, 0)",
        `after-leave=${transformAfterLeave}`,
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
