// Real-browser interaction check for magicCard — moves the mouse across the
// card and asserts the `--magic-card-x`/`--magic-card-y` spotlight-position
// CSS variables actually update to follow the cursor, and the glow fades
// out again on mouse-leave.
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "magicCard");
    const rootLocator = await locate(page, "magicCard");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const glowLayer = componentRoot.locator("> div").first();

    const box = await componentRoot.boundingBox();
    if (!box) {
      report("magicCard bounds", false, "component root has no bounding box");
    } else {
      const readVars = () =>
        componentRoot.evaluate((el) => ({
          x: (el as HTMLElement).style.getPropertyValue("--magic-card-x"),
          y: (el as HTMLElement).style.getPropertyValue("--magic-card-y"),
        }));

      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2, {
        steps: 5,
      });
      await page.waitForTimeout(100);
      const positionA = await readVars();
      const opacityA = await glowLayer.evaluate(
        (el) => (el as HTMLElement).style.opacity,
      );

      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, {
        steps: 5,
      });
      await page.waitForTimeout(100);
      const positionB = await readVars();
      const opacityB = await glowLayer.evaluate(
        (el) => (el as HTMLElement).style.opacity,
      );

      report(
        "magicCard spotlight CSS variables follow the cursor",
        positionA.x !== positionB.x && positionA.y !== positionB.y,
        `A=${JSON.stringify(positionA)} B=${JSON.stringify(positionB)}`,
      );
      report(
        "magicCard glow is visible while hovering",
        opacityA === "1" && opacityB === "1",
        `opacityA=${opacityA} opacityB=${opacityB}`,
      );

      await page.mouse.move(box.x - 100, box.y - 100, { steps: 5 });
      await page.waitForTimeout(300);
      const opacityAfterLeave = await glowLayer.evaluate(
        (el) => (el as HTMLElement).style.opacity,
      );
      report(
        "magicCard glow fades out on mouse-leave",
        opacityAfterLeave === "0",
        `opacity=${opacityAfterLeave}`,
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
