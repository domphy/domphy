// REAL browser interaction check for heroHighlight — moves the mouse across
// the section and asserts the spotlight actually follows cursor position
// (the `--hero-highlight-x`/`--hero-highlight-y` CSS custom properties the
// component writes on `pointermove`, per src/aceternity/text/heroHighlight.ts),
// and that the spotlight dot layer's opacity actually toggles on hover.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "heroHighlight");
  const wrapper = await locate(page, "heroHighlight");
  const root = wrapper.locator(".block-box > *").first();
  const box = await root.boundingBox();
  if (!box) throw new Error("heroHighlight root has no bounding box");

  // Start away from the section entirely so the first move-in is a genuine
  // pointerenter, not a no-op move within an already-hovered element.
  await page.mouse.move(2, 2);
  await page.waitForTimeout(50);

  const pointA = { x: box.x + box.width * 0.15, y: box.y + box.height * 0.2 };
  await page.mouse.move(pointA.x, pointA.y, { steps: 5 });
  // The spotlight layer's opacity is CSS-transitioned over 200ms (see the
  // component's own `transition: "opacity 200ms ease"`) — wait past that so
  // we read the settled value, not a mid-transition snapshot.
  await page.waitForTimeout(300);
  const readVars = () =>
    root.evaluate((element) => ({
      x: (element as HTMLElement).style.getPropertyValue("--hero-highlight-x"),
      y: (element as HTMLElement).style.getPropertyValue("--hero-highlight-y"),
    }));
  const varsAtA = await readVars();

  const spotlightOpacityWhileHovering = await root.evaluate(
    (element) => getComputedStyle(element.children[1] as HTMLElement).opacity,
  );

  const pointB = { x: box.x + box.width * 0.85, y: box.y + box.height * 0.8 };
  await page.mouse.move(pointB.x, pointB.y, { steps: 5 });
  await page.waitForTimeout(80);
  const varsAtB = await readVars();

  report(
    "heroHighlight: CSS spotlight vars follow cursor across two positions",
    varsAtA.x !== varsAtB.x && varsAtA.y !== varsAtB.y,
    `A=(${varsAtA.x}, ${varsAtA.y}) B=(${varsAtB.x}, ${varsAtB.y})`,
  );

  report(
    "heroHighlight: spotlight dot layer opacity is 1 while hovering",
    spotlightOpacityWhileHovering === "1",
    `opacity while hovering = ${spotlightOpacityWhileHovering}`,
  );

  // Move fully off the section — pointerleave should fade the spotlight back out.
  await page.mouse.move(2, 2, { steps: 5 });
  await page.waitForTimeout(250);
  const spotlightOpacityAfterLeave = await root.evaluate(
    (element) => getComputedStyle(element.children[1] as HTMLElement).opacity,
  );
  report(
    "heroHighlight: spotlight dot layer opacity returns to 0 after pointerleave",
    spotlightOpacityAfterLeave === "0",
    `opacity after leave = ${spotlightOpacityAfterLeave}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
