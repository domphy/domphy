// REAL browser interaction check for containerCover — hovers over the
// wrapped word and asserts the beams/sparkles panel actually reveals
// (opacity 0 -> 1, per src/aceternity/layout/containerCover.ts's `hovered`
// state driving the panel's `isActive`), and that the text itself
// brightens while active, both reverting once the mouse moves away.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "containerCover");
  const wrapper = await locate(page, "containerCover");
  // The block's own root IS the hover-target span (onPointerEnter/Leave are
  // attached directly to it) — it appears first in document order among all
  // descendant spans (its own text span comes after it).
  const root = wrapper.locator(".block-box > *").first();
  const panel = root.locator("div").first(); // the beams/sparkles panel, first child div
  const textSpan = root.locator("span").last(); // the wrapped word's own span

  const panelOpacityBefore = await panel.evaluate((element) => getComputedStyle(element).opacity);
  const textColorBefore = await textSpan.evaluate((element) => getComputedStyle(element).color);

  await root.hover();
  // Panel opacity/transform and text color are CSS-transitioned over 220ms.
  await page.waitForTimeout(350);
  const panelOpacityWhileHovering = await panel.evaluate((element) => getComputedStyle(element).opacity);
  const textColorWhileHovering = await textSpan.evaluate((element) => getComputedStyle(element).color);

  report(
    "containerCover: beams/sparkles panel reveals (opacity increases) on hover",
    Number(panelOpacityBefore) === 0 && Number(panelOpacityWhileHovering) === 1,
    `panel opacity before=${panelOpacityBefore} while-hovering=${panelOpacityWhileHovering}`,
  );

  report(
    "containerCover: wrapped text brightens to a different color while hovering",
    textColorWhileHovering !== textColorBefore,
    `text color before=${textColorBefore} while-hovering=${textColorWhileHovering}`,
  );

  await page.mouse.move(2, 2, { steps: 5 });
  await page.waitForTimeout(350);
  const panelOpacityAfterLeave = await panel.evaluate((element) => getComputedStyle(element).opacity);
  report(
    "containerCover: panel reverts (opacity back to 0) after moving away",
    Number(panelOpacityAfterLeave) === 0,
    `panel opacity after leave = ${panelOpacityAfterLeave}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
