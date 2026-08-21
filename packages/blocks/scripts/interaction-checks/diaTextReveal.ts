// REAL browser interaction check for diaTextReveal — the real "interaction"
// here is scroll-into-view (default `autoStart: true`, per
// src/magicui/text/diaTextReveal.ts's own IntersectionObserver), which
// `locate()` triggers by scrolling the block to center viewport. Asserts the
// gradient-clipped text actually paints a moving sweep (not a frozen
// background-image) and keeps the default copy after the one-shot duration.
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

const EXPECTED_TEXT = "Reveal Yourself"; // diaTextReveal()'s own default `children`
const SWEEP_DURATION_MS = 1500; // diaTextReveal()'s own default `duration`

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "diaTextReveal");
  // locate() itself performs the scrollIntoView that satisfies this
  // component's IntersectionObserver (threshold 0.2) and starts the sweep.
  const wrapper = await locate(page, "diaTextReveal");
  const root = wrapper.locator(".block-box > *").first();

  const readSweep = () =>
    root.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        text: element.textContent,
        backgroundImage: computed.backgroundImage,
        backgroundClip:
          computed.backgroundClip || computed.webkitBackgroundClip,
        color: computed.color,
      };
    });

  const soonAfterScroll = await readSweep();
  const sweepRunning =
    soonAfterScroll.text === EXPECTED_TEXT &&
    soonAfterScroll.backgroundImage.includes("gradient");
  report(
    "diaTextReveal: gradient sweep is painted on the text shortly after scrolling into view",
    sweepRunning,
    `soon after scroll = ${JSON.stringify(soonAfterScroll)}`,
  );

  const midSweep = await readSweep();
  await page.waitForTimeout(400);
  const midSweepLater = await readSweep();
  report(
    "diaTextReveal: the gradient actually moves during the sweep (not a frozen frame)",
    midSweep.backgroundImage !== midSweepLater.backgroundImage,
    `first=${midSweep.backgroundImage} later=${midSweepLater.backgroundImage}`,
  );

  await page.waitForTimeout(SWEEP_DURATION_MS + 200);
  const afterSweep = await readSweep();
  report(
    "diaTextReveal: text stays 'Reveal Yourself' after the one-shot sweep settles",
    afterSweep.text === EXPECTED_TEXT &&
      afterSweep.backgroundImage.includes("gradient"),
    `after sweep = ${JSON.stringify(afterSweep)}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
