// Real-browser interaction check for dock: moves the real cursor across the
// icon row at several x-positions and asserts each icon's own layout
// width/height (imperative DOM writes driven by live cursor position, per
// dock.ts's own "canvas loop" comment — not Domphy reactivity) actually
// reflects proximity to the cursor — the closest icon should grow, a far
// icon should not.
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
  const page = await mountedPage(demoUrl, "dock");
  await locate(page, "dock");

  const icons = page.locator('[data-block="dock"] nav > a');
  const count = await icons.count();
  report(
    "dock:renders-icon-buttons",
    count >= 5,
    `expected several icon buttons, got ${count}`,
  );

  const boxes: { x: number; y: number; width: number; height: number }[] = [];
  for (let index = 0; index < count; index++) {
    const box = await icons.nth(index).boundingBox();
    if (box) boxes.push(box);
  }

  const sizeOf = (index: number) =>
    page.evaluate((index_) => {
      const nodes = document.querySelectorAll('[data-block="dock"] nav > a');
      const element = nodes[index_] as HTMLElement | undefined;
      if (!element) return { width: 0, height: 0 };
      return {
        width: element.getBoundingClientRect().width,
        height: Number.parseFloat(element.style.width) || 0,
      };
    }, index);

  // Hover the leftmost icon: it should grow in layout width (dock.ts writes
  // width/height, not transform scale) while the rightmost stays near rest.
  const firstCenter = {
    x: boxes[0].x + boxes[0].width / 2,
    y: boxes[0].y + boxes[0].height / 2,
  };
  const lastIndex = boxes.length - 1;
  const lastCenter = {
    x: boxes[lastIndex].x + boxes[lastIndex].width / 2,
    y: boxes[lastIndex].y + boxes[lastIndex].height / 2,
  };
  const restWidth = boxes[0].width;

  await page.mouse.move(firstCenter.x, firstCenter.y, { steps: 10 });
  await page.waitForTimeout(280);
  const firstWhenHovered = await sizeOf(0);
  const lastWhileFar = await sizeOf(lastIndex);
  report(
    "dock:hovered-icon-magnifies-vs-far-icon",
    firstWhenHovered.width > restWidth * 1.05 &&
      firstWhenHovered.width > lastWhileFar.width,
    `expected leftmost icon's own width to grow well past rest (${restWidth}px) and exceed the far rightmost icon while hovering the leftmost icon; leftmost=${firstWhenHovered.width} rightmost=${lastWhileFar.width}`,
  );

  await page.mouse.move(lastCenter.x, lastCenter.y, { steps: 10 });
  await page.waitForTimeout(280);
  const lastWhenHovered = await sizeOf(lastIndex);
  const firstWhileFar = await sizeOf(0);
  report(
    "dock:magnification-follows-cursor-to-other-end",
    lastWhenHovered.width > restWidth * 1.05 &&
      lastWhenHovered.width > firstWhileFar.width,
    `expected rightmost icon's own width to grow and exceed the now-far leftmost icon after moving the cursor there; rightmost=${lastWhenHovered.width} leftmost=${firstWhileFar.width}`,
  );

  // Cursor leaves the dock: inline width/height clear (pointerX === null).
  await page.mouse.move(20, 20, { steps: 5 });
  await page.waitForTimeout(280);
  const restInline = await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll('[data-block="dock"] nav > a'),
    ) as HTMLElement[];
    return nodes.map((node) => ({
      width: node.style.width,
      height: node.style.height,
    }));
  });
  const allAtRest = restInline.every((size) => !size.width && !size.height);
  report(
    "dock:relaxes-when-cursor-leaves",
    allAtRest,
    `expected every icon's inline width/height to clear once the cursor moves off the dock, got ${JSON.stringify(restInline)}`,
  );

  await page.close();
  await teardown();
}

main()
  .then(() => summarize())
  .catch((error) => {
    console.error(error);
    report("dock:script-error", false, String(error));
    summarize();
  });
