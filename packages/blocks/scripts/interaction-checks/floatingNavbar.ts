// Real-browser interaction check for floatingNavbar: direction-based
// hide-on-scroll-down / show-on-scroll-up, driven via small incremental
// `page.mouse.wheel()` steps (not one huge jump) so the component's own
// guard against large single-frame deltas (a programmatic jump, not a real
// scroll gesture — see floatingNavbar.ts's `applyScrollDirection` comment)
// doesn't just silently resync instead of reacting.
import { boot, teardown, mountedPage, locate, report, summarize } from "../interaction-harness.js";

const HEADER_SELECTOR = '[data-block="floatingNavbar"] header';

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "floatingNavbar");
  await locate(page, "floatingNavbar");
  await page.mouse.move(640, 450);

  const opacityOf = () =>
    page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLElement | null;
      return element ? getComputedStyle(element).opacity : null;
    }, HEADER_SELECTOR);

  const initialOpacity = await opacityOf();
  report(
    "floatingNavbar:initial-visible",
    initialOpacity === "1",
    `expected opacity 1 after mount+scrollIntoView jump (guarded), got ${initialOpacity}`,
  );

  // Small real steps summing well past the 80px show/hide threshold, each
  // step comfortably under window.innerHeight so the big-jump guard never
  // engages.
  for (let step = 0; step < 5; step++) {
    await page.mouse.wheel(0, 70);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(320);
  const hiddenOpacity = await opacityOf();
  report(
    "floatingNavbar:hides-on-scroll-down",
    hiddenOpacity === "0",
    `expected opacity 0 after 5x70px downward wheel steps (~350px), got ${hiddenOpacity}`,
  );

  for (let step = 0; step < 5; step++) {
    await page.mouse.wheel(0, -70);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(320);
  const revealedOpacity = await opacityOf();
  report(
    "floatingNavbar:reappears-on-scroll-up",
    revealedOpacity === "1",
    `expected opacity 1 after 5x70px upward wheel steps, got ${revealedOpacity}`,
  );

  // A single huge jump (bigger than window.innerHeight) in one wheel event
  // simulates a programmatic scroll (anchor navigation, scroll restore) —
  // the guard should resync silently rather than reading it as "scrolled
  // down, hide".
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(320);
  const afterJumpOpacity = await opacityOf();
  report(
    "floatingNavbar:ignores-single-huge-jump",
    afterJumpOpacity === "1",
    `expected opacity to stay 1 across one 3000px single-frame jump (guarded), got ${afterJumpOpacity}`,
  );

  await page.close();
  await teardown();
}

main()
  .then(() => summarize())
  .catch((error) => {
    console.error(error);
    report("floatingNavbar:script-error", false, String(error));
    summarize();
  });
