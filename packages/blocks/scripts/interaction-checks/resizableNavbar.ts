// Real-browser interaction check for resizableNavbar: continuous
// interpolation of width/border-radius against raw scroll offset (0..1
// progress over `shrinkDistancePx`, default 240px) — distinct from
// floatingNavbar's direction-based hide/reveal, this one only ever resizes
// in place and never fully hides. Driven via small incremental
// `page.mouse.wheel()` steps, not one huge jump.
import { boot, teardown, mountedPage, locate, report, summarize } from "../interaction-harness.js";

const NAV_SELECTOR = '[data-block="resizableNavbar"] nav[aria-label="Primary"]';

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "resizableNavbar");
  await locate(page, "resizableNavbar");
  await page.mouse.move(640, 450);

  // NOTE: width is intentionally NOT used as a shrink signal here — the bar
  // also carries `maxWidth: themeSpacing(240)` (960px), and at this harness's
  // 1280px viewport BOTH the 100% and 86% states resolve above that cap
  // (1200px and 1032px respectively), so they clamp to the identical 960px
  // and width never visibly changes at this breakpoint. borderRadius and
  // boxShadow aren't capped and reliably track `progress` instead.
  const measure = () =>
    page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        borderRadius: Number.parseFloat(style.borderRadius) || 0,
        boxShadow: style.boxShadow,
      };
    }, NAV_SELECTOR);

  // Establish a known baseline: scrolled to the very top, fully expanded
  // (progress = 0). The prior locate() jump left window.scrollY at whatever
  // position centers this card in the huge 252-block list, which — since
  // resizableNavbar reacts to *absolute* scroll offset, not direction deltas
  // — would otherwise start the check already fully shrunk.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const expanded = await measure();

  for (let step = 0; step < 5; step++) {
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);
  const shrunk = await measure();

  report(
    "resizableNavbar:shrinks-on-scroll-down",
    !!expanded &&
      !!shrunk &&
      shrunk.borderRadius > expanded.borderRadius &&
      expanded.boxShadow === "none" &&
      shrunk.boxShadow !== "none",
    `expected more-rounded bar + a real box-shadow after ~300px down (past 240px shrinkDistancePx); expanded=${JSON.stringify(expanded)} shrunk=${JSON.stringify(shrunk)}`,
  );

  for (let step = 0; step < 5; step++) {
    await page.mouse.wheel(0, -60);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);
  const reExpanded = await measure();

  report(
    "resizableNavbar:re-expands-on-scroll-up",
    !!reExpanded &&
      !!shrunk &&
      reExpanded.borderRadius < shrunk.borderRadius &&
      reExpanded.boxShadow === "none",
    `expected less-rounded bar + shadow gone after scrolling back to top; shrunk=${JSON.stringify(shrunk)} reExpanded=${JSON.stringify(reExpanded)}`,
  );

  // Continuous interpolation, not a hard on/off toggle: halfway down the
  // shrink distance should land strictly between the two extremes.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.mouse.wheel(0, 60);
  await page.mouse.wheel(0, 60);
  await page.waitForTimeout(400);
  const midway = await measure();

  report(
    "resizableNavbar:interpolates-continuously",
    !!midway &&
      !!expanded &&
      !!shrunk &&
      midway.borderRadius > expanded.borderRadius &&
      midway.borderRadius < shrunk.borderRadius,
    `expected midway (~120px, half of 240px shrinkDistancePx) borderRadius strictly between expanded/shrunk; expanded=${expanded?.borderRadius} midway=${midway?.borderRadius} shrunk=${shrunk?.borderRadius}`,
  );

  await page.close();
  await teardown();
}

main()
  .then(() => summarize())
  .catch((error) => {
    console.error(error);
    report("resizableNavbar:script-error", false, String(error));
    summarize();
  });
