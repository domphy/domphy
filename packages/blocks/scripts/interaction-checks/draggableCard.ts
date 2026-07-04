// Real-browser interaction check for draggableCard — performs a real
// pointer drag (mouse down, several intermediate moves, mouse up) and
// asserts the card's on-screen position actually moved, then settles near
// the release point instead of springing back to its start.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "draggableCard");
    const rootLocator = await locate(page, "draggableCard");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const cards = componentRoot.locator("> div");

    const cardCount = await cards.count();
    if (cardCount < 1) {
      report("draggableCard card count", false, `expected >=1 card, found ${cardCount}`);
    } else {
      // The cards heavily overlap in their default stacked positions and
      // each carries a resting `z-index: index` — use the LAST one so a real
      // mouse click at its own center is guaranteed to actually hit it (not
      // whichever earlier card happens to render underneath at that point).
      const card = cards.last();
      const startBox = await card.boundingBox();
      if (!startBox) {
        report("draggableCard start bounds", false, "card has no bounding box before drag");
      } else {
        const startX = startBox.x + startBox.width / 2;
        const startY = startBox.y + startBox.height / 2;
        const deltaX = 160;
        const deltaY = 90;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        const steps = 10;
        for (let step = 1; step <= steps; step += 1) {
          await page.mouse.move(startX + (deltaX * step) / steps, startY + (deltaY * step) / steps);
          await page.waitForTimeout(16);
        }
        const midDragBox = await card.boundingBox();
        await page.mouse.up();

        report(
          "draggableCard moves live while dragging",
          !!midDragBox && Math.abs(midDragBox.x - startBox.x) > 30,
          `start=${JSON.stringify(startBox)} midDrag=${JSON.stringify(midDragBox)}`,
        );

        // Give the release spring-damper time to settle.
        await page.waitForTimeout(1200);
        const settledBox = await card.boundingBox();

        report(
          "draggableCard settles at a new position after release",
          !!settledBox && Math.hypot(settledBox.x - startBox.x, settledBox.y - startBox.y) > 50,
          `start=${JSON.stringify(startBox)} settled=${JSON.stringify(settledBox)}`,
        );
      }
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
