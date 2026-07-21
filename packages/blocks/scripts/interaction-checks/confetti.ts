// Real-browser interaction check for confetti — this export has no trigger
// button of its own (that's confettiButton); by default it `autoFire`s a
// burst ~150ms after mount instead. Samples the canvas's alpha content twice,
// ~500ms apart, and asserts it's actually animating (not a frozen frame) —
// proving the auto-fired burst really rendered and is progressing, the same
// real-animation signal the task asks for via "click then sample", adapted
// to this component's actual (mount-driven, not click-driven) trigger.
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
    const page = await mountedPage(demoUrl, "confetti");
    const rootLocator = await locate(page, "confetti");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    // `confetti()`'s own root element IS the canvas (position: fixed).
    const canvasLocator = componentRoot;

    const sampleAlphaSum = () =>
      canvasLocator.evaluate((el) => {
        const canvas = el as HTMLCanvasElement;
        const context = canvas.getContext("2d")!;
        const data = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let sum = 0;
        for (let index = 3; index < data.length; index += 4) sum += data[index];
        return sum;
      });

    // `mountedPage()` already waits ~300ms after mounting, and `autoFireDelay`
    // defaults to 150ms, so the burst has typically already fired by now —
    // sample twice to prove it's live particle motion, not a static leftover.
    const signatureA = await sampleAlphaSum();
    await page.waitForTimeout(500);
    const signatureB = await sampleAlphaSum();

    report(
      "confetti auto-fires a burst shortly after mount (canvas has drawn content)",
      signatureA > 0 || signatureB > 0,
      `alphaSumA=${signatureA} alphaSumB=${signatureB}`,
    );
    report(
      "confetti canvas content differs ~500ms apart (particles actually moving)",
      signatureA !== signatureB,
      `alphaSumA=${signatureA} alphaSumB=${signatureB}`,
    );

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
