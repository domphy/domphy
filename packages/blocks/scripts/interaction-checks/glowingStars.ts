// Real-browser interaction check for glowingStars — hovers the card and
// asserts the whole star grid actually bursts into a lit glow (real
// computed box-shadow change across nearly all dots), distinct from the
// small idle ambient flicker, then clears again on pointer-leave.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "glowingStars");
    const rootLocator = await locate(page, "glowingStars");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const starGrid = componentRoot.locator("> div").first();

    const countLitStars = () =>
      starGrid.evaluate((grid) => {
        const stars = Array.from(grid.children) as HTMLElement[];
        const total = stars.length;
        const lit = stars.filter((star) => getComputedStyle(star).boxShadow !== "none").length;
        return { total, lit };
      });

    const before = await countLitStars();
    report("glowingStars only a small idle subset lit before hover", before.lit <= 10, `total=${before.total} lit=${before.lit}`);

    await componentRoot.hover();
    await page.waitForTimeout(400);
    const duringHover = await countLitStars();
    report(
      "glowingStars whole grid bursts into glow on hover",
      duringHover.lit >= duringHover.total * 0.9,
      `total=${duringHover.total} lit=${duringHover.lit}`,
    );

    await page.mouse.move(0, 0);
    // The lit->unlit fade runs on a `glowDurationMs` (2000ms default) CSS
    // transition — wait past that for box-shadow to actually reach "none".
    await page.waitForTimeout(2300);
    const afterLeave = await countLitStars();
    report("glowingStars glow clears on pointer-leave", afterLeave.lit <= 10, `total=${afterLeave.total} lit=${afterLeave.lit}`);

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
