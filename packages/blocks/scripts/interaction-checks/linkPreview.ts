// REAL browser interaction check for linkPreview — hovers over the wrapped
// link and asserts the floating preview card actually becomes visible
// (opacity 0 -> 1, per src/aceternity/overlays/linkPreview.ts's
// `openState` listener), then moves away and asserts it disappears again.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "linkPreview");
  const wrapper = await locate(page, "linkPreview");
  const root = wrapper.locator(".block-box > *").first();
  const link = root.locator("a");
  const previewCard = root.locator('[role="presentation"]');

  const opacityBeforeHover = await previewCard.evaluate((element) => getComputedStyle(element).opacity);
  report(
    "linkPreview: preview card hidden (opacity 0) before hovering the link",
    opacityBeforeHover === "0",
    `opacity before hover = ${opacityBeforeHover}`,
  );

  await link.hover();
  // The card's opacity/transform are CSS-transitioned over 150ms.
  await page.waitForTimeout(300);
  const opacityWhileHovering = await previewCard.evaluate((element) => getComputedStyle(element).opacity);
  report(
    "linkPreview: preview card becomes visible (opacity 1) after hovering the link",
    opacityWhileHovering === "1",
    `opacity while hovering = ${opacityWhileHovering}`,
  );

  // Move the mouse well away from both the link and the (now-visible) card.
  await page.mouse.move(2, 2, { steps: 5 });
  await page.waitForTimeout(300);
  const opacityAfterLeave = await previewCard.evaluate((element) => getComputedStyle(element).opacity);
  report(
    "linkPreview: preview card disappears (opacity 0) after moving away",
    opacityAfterLeave === "0",
    `opacity after leave = ${opacityAfterLeave}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
