// Real-browser interaction check for dock: moves the real cursor across the
// icon row at several x-positions and asserts each icon's own `transform`
// (imperative DOM writes driven by live cursor position, per dock.ts's own
// "canvas loop" comment — not Domphy reactivity) actually reflects proximity
// to the cursor — the closest icon should scale up, a far icon should not.
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

function scaleOf(transform: string): number {
  if (!transform || transform === "none") return 1;
  const match = transform.match(/scale\(([\d.]+)\)/);
  return match ? Number.parseFloat(match[1]) : 1;
}

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

  const transformOf = (index: number) =>
    page.evaluate((index_) => {
      const nodes = document.querySelectorAll('[data-block="dock"] nav > a');
      const element = nodes[index_] as HTMLElement | undefined;
      return element ? element.style.transform : null;
    }, index);

  // Hover the leftmost icon: it should magnify while the rightmost (far
  // enough away given the default 3.5x-icon-width proximity falloff) stays
  // at rest.
  const firstCenter = {
    x: boxes[0].x + boxes[0].width / 2,
    y: boxes[0].y + boxes[0].height / 2,
  };
  const lastIndex = boxes.length - 1;
  const lastCenter = {
    x: boxes[lastIndex].x + boxes[lastIndex].width / 2,
    y: boxes[lastIndex].y + boxes[lastIndex].height / 2,
  };

  await page.mouse.move(firstCenter.x, firstCenter.y, { steps: 10 });
  await page.waitForTimeout(150);
  const firstScaleWhenHovered = scaleOf((await transformOf(0)) ?? "");
  const lastScaleWhileFarHovered = scaleOf(
    (await transformOf(lastIndex)) ?? "",
  );
  report(
    "dock:hovered-icon-magnifies-vs-far-icon",
    firstScaleWhenHovered > 1.05 &&
      firstScaleWhenHovered > lastScaleWhileFarHovered,
    `expected leftmost icon's own scale to grow well past 1 and exceed the far rightmost icon's scale while hovering the leftmost icon; leftmost=${firstScaleWhenHovered} rightmost=${lastScaleWhileFarHovered}`,
  );

  // Move to the rightmost icon instead: the effect should follow the
  // cursor — now the rightmost grows and the (now-far) leftmost relaxes.
  await page.mouse.move(lastCenter.x, lastCenter.y, { steps: 10 });
  await page.waitForTimeout(150);
  const lastScaleWhenHovered = scaleOf((await transformOf(lastIndex)) ?? "");
  const firstScaleWhileFarHovered = scaleOf((await transformOf(0)) ?? "");
  report(
    "dock:magnification-follows-cursor-to-other-end",
    lastScaleWhenHovered > 1.05 &&
      lastScaleWhenHovered > firstScaleWhileFarHovered,
    `expected rightmost icon's own scale to grow and exceed the now-far leftmost icon's scale after moving the cursor there; rightmost=${lastScaleWhenHovered} leftmost=${firstScaleWhileFarHovered}`,
  );

  // Cursor leaves the dock entirely: everything should relax back to rest
  // (no inline transform at all, per dock.ts's `pointerX === null` branch).
  await page.mouse.move(20, 20, { steps: 5 });
  await page.waitForTimeout(150);
  const restTransforms = await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll('[data-block="dock"] nav > a'),
    ) as HTMLElement[];
    return nodes.map((node) => node.style.transform);
  });
  const allAtRest = restTransforms.every((transform) => !transform);
  report(
    "dock:relaxes-when-cursor-leaves",
    allAtRest,
    `expected every icon's inline transform to clear once the cursor moves off the dock, got ${JSON.stringify(restTransforms)}`,
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
