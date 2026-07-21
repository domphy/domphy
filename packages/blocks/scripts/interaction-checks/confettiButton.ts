// Real-browser interaction check for confettiButton — clicks the "Celebrate"
// button and asserts the overlay canvas actually shows burst content shortly
// after (alpha-channel readback via getImageData; plain 2D context, no
// WebGL), where it showed none before the click.
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
    const page = await mountedPage(demoUrl, "confettiButton");
    const rootLocator = await locate(page, "confettiButton");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const canvasLocator = componentRoot.locator("canvas");

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

    const beforeClick = await sampleAlphaSum();
    await componentRoot.click();

    // Poll across a window rather than one fixed point in time: the default
    // options launch particles straight up (angle 90, startVelocity 45) from
    // near the canvas bottom, so they briefly arc above the canvas's top
    // edge — genuinely invisible/out of the sampled bounds — before gravity
    // pulls them back down into view a bit later. A single sample can land
    // in that legitimate mid-arc gap.
    let peakAfterClick = 0;
    for (let sampleIndex = 0; sampleIndex < 8; sampleIndex += 1) {
      await page.waitForTimeout(60);
      peakAfterClick = Math.max(peakAfterClick, await sampleAlphaSum());
    }

    report(
      "confettiButton fires a burst on click (canvas goes from blank to drawn)",
      beforeClick === 0 && peakAfterClick > 0,
      `before=${beforeClick} peakAfterClick=${peakAfterClick}`,
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
