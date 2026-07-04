// REAL browser interaction check for textHoverEffect — hovers over the big
// outlined text and asserts the gradient-fill reveal mask circle actually
// activates: its `cx`/`cy` attributes track the cursor and its opacity flips
// 0 -> 1 on pointermove, then back to 0 on pointerleave (see
// src/aceternity/text/textHoverEffect.ts's `setRevealPosition`/`handlePointerMove`).
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "textHoverEffect");
  const wrapper = await locate(page, "textHoverEffect");
  const root = wrapper.locator(".block-box > *").first();
  const box = await root.boundingBox();
  if (!box) throw new Error("textHoverEffect root has no bounding box");
  const circle = root.locator("circle");

  await page.mouse.move(2, 2);
  await page.waitForTimeout(50);
  const opacityBeforeHover = await circle.evaluate((element) => getComputedStyle(element).opacity);

  const pointA = { x: box.x + box.width * 0.2, y: box.y + box.height * 0.3 };
  await page.mouse.move(pointA.x, pointA.y, { steps: 5 });
  await page.waitForTimeout(80);
  const cxAtA = await circle.getAttribute("cx");
  const cyAtA = await circle.getAttribute("cy");
  const opacityWhileHovering = await circle.evaluate((element) => getComputedStyle(element).opacity);

  const pointB = { x: box.x + box.width * 0.75, y: box.y + box.height * 0.7 };
  await page.mouse.move(pointB.x, pointB.y, { steps: 5 });
  await page.waitForTimeout(80);
  const cxAtB = await circle.getAttribute("cx");
  const cyAtB = await circle.getAttribute("cy");

  report(
    "textHoverEffect: reveal mask hidden (opacity 0) before any hover",
    opacityBeforeHover === "0",
    `opacity before hover = ${opacityBeforeHover}`,
  );

  report(
    "textHoverEffect: reveal mask activates (opacity 1) and cx/cy track two different cursor positions",
    opacityWhileHovering === "1" && cxAtA !== cxAtB && cyAtA !== cyAtB,
    `opacity=${opacityWhileHovering} A=(${cxAtA}, ${cyAtA}) B=(${cxAtB}, ${cyAtB})`,
  );

  await page.mouse.move(2, 2, { steps: 5 });
  await page.waitForTimeout(50);
  const opacityAfterLeave = await circle.evaluate((element) => getComputedStyle(element).opacity);
  report(
    "textHoverEffect: reveal mask deactivates (opacity 0) after pointerleave",
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
