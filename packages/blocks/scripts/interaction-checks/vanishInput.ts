// Real browser interaction checks for vanishInput (src/aceternity/inputs/vanishInput.ts).
//
// Types real text and submits via Enter, asserting the vanish/dissolve
// actually renders particles on the canvas and the field clears once it
// finishes; separately waits out a full rotationInterval with an empty field
// to assert the animated placeholder text actually cycles.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "vanishInput");
  await locate(page, "vanishInput");

  const wrapper = page.locator('[data-block="vanishInput"]');
  const input = wrapper.locator("input").first();
  const canvas = wrapper.locator("canvas").first();

  await input.click();
  await input.type("hello vanish");
  const typedValue = await input.inputValue();
  report(
    "vanishInput: typing fills the real input value",
    typedValue === "hello vanish",
    `input.value=${JSON.stringify(typedValue)}`,
  );

  await input.press("Enter");
  // Immediately after submit the field goes readonly and particles start
  // drawing onto the canvas — sample a frame shortly after to catch the
  // dissolve mid-flight before it finishes.
  await page.waitForTimeout(120);
  const [readonlyDuringVanish, hasPaintedPixels] = await Promise.all([
    input.getAttribute("readonly"),
    canvas.evaluate((el) => {
      const context = (el as HTMLCanvasElement).getContext("2d");
      if (!context) return false;
      const { width, height } = el as HTMLCanvasElement;
      if (width === 0 || height === 0) return false;
      const pixels = context.getImageData(0, 0, width, height).data;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] > 0) return true;
      }
      return false;
    }),
  ]);
  report(
    "vanishInput: Enter triggers the dissolve — canvas paints real particle pixels while readonly",
    readonlyDuringVanish !== null && hasPaintedPixels,
    `readonly=${readonlyDuringVanish} paintedPixels=${hasPaintedPixels}`,
  );

  // Particle decay (0.025-0.06/frame at 60fps) fully fades within ~2s; give
  // it a comfortable margin, then confirm the field actually cleared and
  // became editable again (isVanishing reset to false).
  await page.waitForTimeout(2200);
  const [valueAfterVanish, readonlyAfterVanish] = await Promise.all([
    input.inputValue(),
    input.getAttribute("readonly"),
  ]);
  report(
    "vanishInput: field clears and becomes editable again once the dissolve finishes",
    valueAfterVanish === "" && readonlyAfterVanish === null,
    `input.value=${JSON.stringify(valueAfterVanish)} readonly=${readonlyAfterVanish}`,
  );

  // Placeholder rotation: field is empty now, so the overlay is visible and
  // should swap text after a full rotationInterval (default 3000ms).
  const placeholderTextBefore = await wrapper.locator('[aria-hidden="true"] span').first().textContent();
  await page.waitForTimeout(3300);
  const placeholderTextAfter = await wrapper.locator('[aria-hidden="true"] span').first().textContent();
  report(
    "vanishInput: rotating placeholder cycles to a different phrase while the field is empty",
    !!placeholderTextBefore && !!placeholderTextAfter && placeholderTextBefore !== placeholderTextAfter,
    `before=${JSON.stringify(placeholderTextBefore)} after=${JSON.stringify(placeholderTextAfter)}`,
  );

  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
