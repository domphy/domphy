// Real-browser interaction check for svgMaskEffect — moves the cursor over
// the panel and asserts the reveal window's position actually follows the
// cursor (the `--reveal-x`/`--reveal-y` CSS custom properties written
// imperatively on `pointermove`, which drive the `mask-image: radial-
// gradient(...)` cutout — there is no literal SVG `<mask>` element in this
// implementation, it's a plain CSS mask referencing custom properties), and
// that the reveal radius grows while hovered.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "svgMaskEffect");
    const rootLocator = await locate(page, "svgMaskEffect");
    const componentRoot = rootLocator.locator(".block-box > *").first();

    const box = await componentRoot.boundingBox();
    if (!box) {
      report("svgMaskEffect bounds", false, "component root has no bounding box");
    } else {
      const readVars = () =>
        componentRoot.evaluate((el) => ({
          x: (el as HTMLElement).style.getPropertyValue("--reveal-x"),
          y: (el as HTMLElement).style.getPropertyValue("--reveal-y"),
          radius: (el as HTMLElement).style.getPropertyValue("--reveal-radius"),
        }));

      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4, { steps: 5 });
      await page.waitForTimeout(150);
      const readingA = await readVars();

      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, { steps: 5 });
      await page.waitForTimeout(150);
      const readingB = await readVars();

      report(
        "svgMaskEffect reveal position follows the cursor",
        readingA.x !== readingB.x && readingA.y !== readingB.y,
        `A=${JSON.stringify(readingA)} B=${JSON.stringify(readingB)}`,
      );

      // Radius eases toward `hoverSize / 2` (200px default) at a 0.18 lerp
      // rate per frame while hovered — wait long enough to converge well
      // past the 40px resting radius.
      await page.waitForTimeout(600);
      const readingAfterHover = await readVars();
      const restingRadius = 40; // half of the 80px default `restingSize`
      report(
        "svgMaskEffect reveal radius grows while hovered",
        Number.parseFloat(readingAfterHover.radius) > restingRadius * 2,
        `radius=${readingAfterHover.radius}`,
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
