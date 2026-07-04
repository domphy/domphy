// Real-browser interaction check for stickyBanner's `hideOnScroll` mode: a
// ONE-WAY, scroll-triggered dismissal (unlike floatingNavbar's reversible
// hide/reveal) — once scrolled past ~40px it hides for good and never
// reappears on scrolling back up.
//
// `hideOnScroll` defaults to false, so the demo's zero-arg `stickyBanner()`
// render never exercises it — mount directly with the prop enabled via
// `mountBlock(name, props)` instead of the plain `mountedPage()` helper.
import { boot, teardown, locate, report, summarize } from "../interaction-harness.js";

const BANNER_SELECTOR = '[data-block="stickyBanner"] [role="note"]';

async function main() {
  const { browser, demoUrl } = await boot();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(demoUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => (window as unknown as { disconnectLazyMount: () => void }).disconnectLazyMount());
  await page.evaluate(
    (n) => (window as unknown as { mountBlock: (x: string, p?: unknown) => void }).mountBlock(n, { hideOnScroll: true }),
    "stickyBanner",
  );
  await page.locator(BANNER_SELECTOR).waitFor({ state: "attached", timeout: 5000 });
  await page.waitForTimeout(300);

  const opacityOf = () =>
    page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLElement | null;
      return element ? getComputedStyle(element).opacity : null;
    }, BANNER_SELECTOR);

  const initialOpacity = await opacityOf();
  report(
    "stickyBanner:initial-visible-at-top",
    initialOpacity === "1",
    `expected opacity 1 right after mount at scrollY=0, got ${initialOpacity}`,
  );

  // locate() scrolls the block's own card into view via `scrollIntoView` — a
  // single-frame *programmatic* jump, exactly the kind floatingNavbar's own
  // guard comment calls out ("an anchor-link/scrollIntoView navigation, the
  // browser restoring scroll position... never from an actual scroll-wheel/
  // trackpad/touch gesture"). stickyBanner's `checkScrollThreshold` has no
  // such guard — it reacts to raw `window.scrollY`, so this jump alone
  // (landing far past the 40px threshold) must not be misread as real user
  // scroll.
  await locate(page, "stickyBanner");
  await page.waitForTimeout(320);
  const afterJumpOpacity = await opacityOf();
  report(
    "stickyBanner:survives-programmatic-jump",
    afterJumpOpacity === "1",
    `expected opacity to stay 1 across a single scrollIntoView jump past the 40px threshold (not a real scroll gesture), got ${afterJumpOpacity}`,
  );

  await page.mouse.move(640, 450);
  for (let step = 0; step < 5; step++) {
    await page.mouse.wheel(0, 20);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(320);
  const hiddenOpacity = await opacityOf();
  report(
    "stickyBanner:hides-on-real-scroll-past-threshold",
    hiddenOpacity === "0",
    `expected opacity 0 after 5x20px real downward wheel steps (~100px, past the 40px threshold), got ${hiddenOpacity}`,
  );

  // One-way latch: scrolling back up must NOT bring it back.
  for (let step = 0; step < 5; step++) {
    await page.mouse.wheel(0, -20);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(320);
  const afterScrollUpOpacity = await opacityOf();
  report(
    "stickyBanner:stays-hidden-on-scroll-up",
    afterScrollUpOpacity === "0",
    `expected opacity to remain 0 after scrolling back up (one-way dismissal, not a toggle), got ${afterScrollUpOpacity}`,
  );

  await page.close();
  await teardown();
}

main()
  .then(() => summarize())
  .catch((error) => {
    console.error(error);
    report("stickyBanner:script-error", false, String(error));
    summarize();
  });
