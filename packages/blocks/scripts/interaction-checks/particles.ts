// Real-browser interaction check for particles — samples the canvas's own
// pixel content (alpha channel + an alpha-weighted centroid, both read back
// directly via getImageData — this is a plain 2D context, not WebGL, so no
// screenshot/preserveDrawingBuffer workaround is needed) at two points in
// time ~500ms apart and asserts they differ, proving the ambient drift loop
// is actually animating rather than a frozen first frame.
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
    const page = await mountedPage(demoUrl, "particles");
    const rootLocator = await locate(page, "particles");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const canvasLocator = componentRoot.locator("canvas");

    const sampleSignature = () =>
      canvasLocator.evaluate((el) => {
        const canvas = el as HTMLCanvasElement;
        const context = canvas.getContext("2d")!;
        const { width, height } = canvas;
        const data = context.getImageData(0, 0, width, height).data;
        let alphaSum = 0;
        let weightedX = 0;
        let weightedY = 0;
        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3];
          if (alpha === 0) continue;
          const pixelIndex = index / 4;
          alphaSum += alpha;
          weightedX += alpha * (pixelIndex % width);
          weightedY += alpha * Math.floor(pixelIndex / width);
        }
        return {
          alphaSum,
          centroidX: alphaSum ? weightedX / alphaSum : 0,
          centroidY: alphaSum ? weightedY / alphaSum : 0,
        };
      });

    // Let the particle field settle past its initial fade-in before sampling.
    await page.waitForTimeout(400);
    const signatureA = await sampleSignature();
    await page.waitForTimeout(500);
    const signatureB = await sampleSignature();

    report(
      "particles canvas has drawn content (not blank)",
      signatureA.alphaSum > 0 && signatureB.alphaSum > 0,
      `alphaSumA=${signatureA.alphaSum} alphaSumB=${signatureB.alphaSum}`,
    );
    report(
      "particles canvas content differs ~500ms apart (actually animating, not a frozen frame)",
      signatureA.alphaSum !== signatureB.alphaSum ||
        signatureA.centroidX !== signatureB.centroidX ||
        signatureA.centroidY !== signatureB.centroidY,
      `A=${JSON.stringify(signatureA)} B=${JSON.stringify(signatureB)}`,
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
