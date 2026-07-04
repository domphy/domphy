// Real-browser interaction check for canvasRevealEffect — hovers the panel
// and asserts the canvas actually starts drawing the revealed dot grid (read
// back via getImageData — the canvas is a plain 2D context here, not WebGL,
// so no preserveDrawingBuffer/screenshot workaround is needed), then fades
// back out again once the pointer leaves.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "canvasRevealEffect");
    const rootLocator = await locate(page, "canvasRevealEffect");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const canvasLocator = componentRoot.locator("canvas");

    const box = await componentRoot.boundingBox();
    if (!box) {
      report("canvasRevealEffect bounds", false, "component root has no bounding box");
    } else {
      const sampleAlphaSum = () =>
        canvasLocator.evaluate((el) => {
          const canvas = el as HTMLCanvasElement;
          const context = canvas.getContext("2d")!;
          const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let sum = 0;
          for (let index = 3; index < data.length; index += 4) sum += data[index];
          return sum;
        });

      // Well outside the panel — resting state, dots should not be drawn.
      await page.mouse.move(box.x - 300, box.y - 300);
      await page.waitForTimeout(400);
      const restingAlpha = await sampleAlphaSum();

      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 8 });
      // `currentReveal` eases toward 1 at an 0.08 lerp rate per frame —
      // 0.92^45 ≈ 0.02, so ~45 frames (~750ms) gets it close to fully revealed.
      await page.waitForTimeout(900);
      const hoveredAlpha = await sampleAlphaSum();

      report(
        "canvasRevealEffect activates the dot-grid reveal on hover",
        restingAlpha === 0 && hoveredAlpha > restingAlpha + 1000,
        `resting=${restingAlpha} hovered=${hoveredAlpha}`,
      );

      await page.mouse.move(box.x - 300, box.y - 300, { steps: 8 });
      await page.waitForTimeout(900);
      const afterLeaveAlpha = await sampleAlphaSum();
      report(
        "canvasRevealEffect fades the reveal back out on pointer-leave",
        afterLeaveAlpha < hoveredAlpha * 0.5,
        `hovered=${hoveredAlpha} afterLeave=${afterLeaveAlpha}`,
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
