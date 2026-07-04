// REAL browser interaction check for compareSlider — performs a real
// press+move+release drag across the slider and asserts the divider/handle
// position actually moves to track the cursor (via its own `aria-valuenow`,
// which mirrors the reactive `percent` state driving the clip-path in
// src/aceternity/layout/compareSlider.ts). Also mounts a SEPARATE instance
// with `autoplay: true` (off by default, so the default-props demo instance
// can't exercise it) and asserts its divider moves on its own with zero
// interaction, per the component's own autoplay doc comment.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "compareSlider");
  const wrapper = await locate(page, "compareSlider");
  const root = wrapper.locator(".block-box > *").first();
  const handle = root.locator('[role="separator"]');

  const box = await root.boundingBox();
  if (!box) throw new Error("compareSlider root has no bounding box");

  const percentBeforeDrag = Number(await handle.getAttribute("aria-valuenow"));

  const leftPoint = { x: box.x + box.width * 0.2, y: box.y + box.height * 0.5 };
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(leftPoint.x, leftPoint.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150); // clip-path/left are CSS-transitioned over 60ms
  const percentAfterLeftDrag = Number(await handle.getAttribute("aria-valuenow"));

  const rightPoint = { x: box.x + box.width * 0.85, y: box.y + box.height * 0.5 };
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(rightPoint.x, rightPoint.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const percentAfterRightDrag = Number(await handle.getAttribute("aria-valuenow"));

  report(
    "compareSlider: a real drag moves the divider to track the cursor (two distinct positions)",
    percentAfterLeftDrag < percentBeforeDrag &&
      percentAfterRightDrag > percentAfterLeftDrag &&
      percentAfterRightDrag > percentBeforeDrag,
    `before=${percentBeforeDrag} afterLeftDrag=${percentAfterLeftDrag} afterRightDrag=${percentAfterRightDrag}`,
  );

  await page.close();

  // Autoplay defaults to `false`, so the default-props demo instance above
  // never exercises it — mount a second, separate instance with it enabled
  // to verify the divider actually drifts on its own with zero interaction.
  const autoplayPage = await mountedPage(demoUrl, "compareSlider");
  await autoplayPage.evaluate(() => {
    (window as unknown as { mountBlockWithProps: (name: string, id: string, props: unknown) => void }).mountBlockWithProps(
      "compareSlider",
      "autoplay-compare-slider",
      { autoplay: true, autoplayDuration: 600, slideMode: "hover" },
    );
  });
  const autoplayHandle = autoplayPage.locator("#autoplay-compare-slider [role=\"separator\"]");
  await autoplayHandle.waitFor({ state: "attached", timeout: 5000 });

  const autoplaySampleA = Number(await autoplayHandle.getAttribute("aria-valuenow"));
  await autoplayPage.waitForTimeout(400); // no mouse interaction at all in this window
  const autoplaySampleB = Number(await autoplayHandle.getAttribute("aria-valuenow"));

  report(
    "compareSlider: with autoplay enabled, the divider moves on its own with no interaction",
    autoplaySampleA !== autoplaySampleB,
    `sampleA=${autoplaySampleA} sampleB=${autoplaySampleB}`,
  );

  await autoplayPage.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
