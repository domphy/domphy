// Real-browser interaction check for `hoverBorderGradient`: hover over it and
// assert the content layer's `filter` computed style actually changes (the
// `&:hover [data-slot=hbg-content]` rule sets `brightness(0.85)`; see
// src/aceternity/buttons/hoverBorderGradient.ts) vs. its un-hovered baseline.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "hoverBorderGradient");
  const locator = await locate(page, "hoverBorderGradient");
  const content = locator.locator('[data-slot="hbg-content"]');

  const baselineFilter = await content.evaluate((element) => getComputedStyle(element).filter);
  report(
    "hoverBorderGradient: content layer has no filter before hovering",
    baselineFilter === "none",
    `baselineFilter=${baselineFilter}`,
  );

  await content.hover();
  // `filter` transitions over 200ms — wait past it so we read the settled
  // value, not a mid-transition sample.
  await page.waitForTimeout(300);
  const hoveredFilter = await content.evaluate((element) => getComputedStyle(element).filter);
  report(
    "hoverBorderGradient: hovering brightens the content layer to filter: brightness(0.85)",
    hoveredFilter === "brightness(0.85)",
    `hoveredFilter=${hoveredFilter}`,
  );

  // Move off, back onto the page body, and confirm the hover-only rule reverts.
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  const revertedFilter = await content.evaluate((element) => getComputedStyle(element).filter);
  report(
    "hoverBorderGradient: filter reverts to baseline after the pointer leaves",
    revertedFilter === baselineFilter,
    `revertedFilter=${revertedFilter}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
