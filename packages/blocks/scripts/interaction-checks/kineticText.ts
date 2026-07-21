// REAL browser interaction check for kineticText — moves the mouse across
// the letters and asserts individual character `font-weight` actually
// changes per the component's own index-distance falloff (see
// src/magicui/community/kineticText.ts's `applyWeights`): hovered letter
// jumps toward `PEAK_WEIGHT` (900), a letter far outside `FALLOFF_RADIUS`
// (4) stays at `BASE_WEIGHT` (200), and everything reverts to baseline on
// pointerleave.
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

const BASE_WEIGHT = "200";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "kineticText");
  const wrapper = await locate(page, "kineticText");
  const root = wrapper.locator(".block-box > *").first();
  // Decorative per-character spans are the only `aria-hidden="true"` spans
  // in the tree (the sr-only duplicate text span has no aria-hidden).
  const letters = root.locator('span[aria-hidden="true"]');
  const letterCount = await letters.count();
  if (letterCount < 10)
    throw new Error(`expected >=10 character spans, got ${letterCount}`);

  const hoveredIndex = 2; // a real letter (not a space) in "Kinetic Type In Motion"
  const farIndex = letterCount - 1; // far outside FALLOFF_RADIUS=4 from hoveredIndex

  const weightBeforeHover = await letters
    .nth(hoveredIndex)
    .evaluate((element) => getComputedStyle(element).fontWeight);

  const targetBox = await letters.nth(hoveredIndex).boundingBox();
  if (!targetBox) throw new Error("hovered letter has no bounding box");
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 5 },
  );
  // The weight write is rAF-scheduled (see `scheduleUpdate`) — one frame is
  // enough, but wait a little longer for determinism across CI machines.
  await page.waitForTimeout(120);

  const weightWhileHovering = await letters
    .nth(hoveredIndex)
    .evaluate((element) => getComputedStyle(element).fontWeight);
  const farWeightWhileHovering = await letters
    .nth(farIndex)
    .evaluate((element) => getComputedStyle(element).fontWeight);

  report(
    "kineticText: hovered letter's font-weight actually increases above baseline",
    Number(weightBeforeHover) === Number(BASE_WEIGHT) &&
      Number(weightWhileHovering) > Number(BASE_WEIGHT),
    `before=${weightBeforeHover} while-hovering=${weightWhileHovering}`,
  );

  report(
    "kineticText: a letter far outside the falloff radius stays at the thin baseline weight",
    Number(farWeightWhileHovering) === Number(BASE_WEIGHT),
    `far-letter weight while hovering hoveredIndex=${hoveredIndex} = ${farWeightWhileHovering}`,
  );

  await page.mouse.move(2, 2, { steps: 5 });
  // font-weight is CSS-transitioned over 260ms (see the character span's own
  // `transition: "font-weight 260ms ease, ..."`) — wait past that so we read
  // the settled value, not a mid-transition snapshot.
  await page.waitForTimeout(400);
  const weightAfterLeave = await letters
    .nth(hoveredIndex)
    .evaluate((element) => getComputedStyle(element).fontWeight);
  report(
    "kineticText: font-weight reverts to baseline after pointerleave",
    Number(weightAfterLeave) === Number(BASE_WEIGHT),
    `weight after leave = ${weightAfterLeave}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
