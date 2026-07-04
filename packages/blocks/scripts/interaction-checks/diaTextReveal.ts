// REAL browser interaction check for diaTextReveal — the real "interaction"
// here is scroll-into-view (default `autoStart: true`, per
// src/magicui/text/diaTextReveal.ts's own IntersectionObserver), which
// `locate()` triggers by scrolling the block to center viewport. Asserts the
// gradient sweep layer actually activates (opacity 0 -> 1) shortly after, and
// deactivates again (opacity 1 -> 0) once the sweep's own `duration` elapses.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const EXPECTED_TEXT = "Reveal Yourself"; // diaTextReveal()'s own default `children`
const SWEEP_DURATION_MS = 1500; // diaTextReveal()'s own default `duration`

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "diaTextReveal");
  // locate() itself performs the scrollIntoView that satisfies this
  // component's IntersectionObserver (threshold 0.2) and starts the sweep.
  const wrapper = await locate(page, "diaTextReveal");
  const root = wrapper.locator(".block-box > *").first();
  const gradientLayer = root.locator('span[aria-hidden="true"]');

  const opacitySoonAfterScroll = await gradientLayer.evaluate((element) => getComputedStyle(element).opacity);
  const baseTextSoonAfterScroll = await root.evaluate((element) => (element.firstChild as HTMLElement)?.textContent);

  report(
    "diaTextReveal: sweep layer activates (opacity 1) shortly after scrolling into view",
    opacitySoonAfterScroll === "1",
    `opacity soon after scroll = ${opacitySoonAfterScroll}, base text = ${JSON.stringify(baseTextSoonAfterScroll)}`,
  );

  // Wait past the sweep's own duration (with margin for the intersection
  // callback + delay=0 startup lag already elapsed above) — it should fade
  // back out and, being a single non-repeating item, not restart.
  await page.waitForTimeout(SWEEP_DURATION_MS + 500);
  const opacityAfterSweep = await gradientLayer.evaluate((element) => getComputedStyle(element).opacity);
  const baseTextAfterSweep = await root.evaluate((element) => (element.firstChild as HTMLElement)?.textContent);

  report(
    "diaTextReveal: sweep layer deactivates (opacity 0) once its duration elapses, text unchanged",
    opacityAfterSweep === "0" && baseTextAfterSweep === EXPECTED_TEXT,
    `opacity after sweep = ${opacityAfterSweep}, base text = ${JSON.stringify(baseTextAfterSweep)}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
