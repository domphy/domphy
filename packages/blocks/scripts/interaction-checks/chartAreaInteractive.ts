// Real-browser interaction check for chartAreaInteractive: hovering the
// plot shows a real per-point tooltip (@domphy/chart's `.dc-tooltip`,
// axis-trigger nearest-index lookup), and picking a different trailing-
// window range preset actually re-renders the WebGL series with different
// pixels (not just swapping some inert prop).
import { boot, teardown, mountedPage, locate, pixelSnapshot, report, summarize } from "../interaction-harness.js";

const BLOCK = "chartAreaInteractive";
const TOOLTIP_SELECTOR = `[data-block="${BLOCK}"] .dc-tooltip`;

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, BLOCK);
  await locate(page, BLOCK);

  const canvas = page.locator(`[data-block="${BLOCK}"] canvas`).first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("chart canvas has no bounding box");

  const tooltipInfo = () =>
    page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLElement | null;
      return element ? { opacity: getComputedStyle(element).opacity, text: element.innerText } : null;
    }, TOOLTIP_SELECTOR);

  const before = await tooltipInfo();
  report(
    "chartAreaInteractive:tooltip-hidden-initially",
    before?.opacity === "0",
    `expected tooltip opacity 0 before any hover, got ${JSON.stringify(before)}`,
  );

  // Nearest-index lookup: positions well inside the grid's own edge margins
  // (`grid: { left: 8, right: 8, ... }`) deterministically resolve to the
  // first/last data point.
  await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 5 });
  await page.waitForTimeout(200);
  const atLeftEdge = await tooltipInfo();

  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, { steps: 15 });
  await page.waitForTimeout(200);
  const atRightEdge = await tooltipInfo();

  report(
    "chartAreaInteractive:hover-shows-per-point-tooltip",
    atLeftEdge?.opacity === "1" &&
      atRightEdge?.opacity === "1" &&
      /Desktop|Mobile/.test(atLeftEdge?.text ?? "") &&
      atLeftEdge?.text !== atRightEdge?.text,
    `expected a visible tooltip naming a series, with DIFFERENT content at the two plot edges (proving it tracks the hovered data point, not a static string); left=${JSON.stringify(atLeftEdge)} right=${JSON.stringify(atRightEdge)}`,
  );

  await page.mouse.move(box.x + box.width + 60, box.y + box.height + 60);
  await page.waitForTimeout(150);
  const afterLeave = await tooltipInfo();
  report(
    "chartAreaInteractive:tooltip-hides-on-mouse-leave",
    afterLeave?.opacity === "0",
    `expected tooltip opacity 0 after moving the cursor off the chart, got ${JSON.stringify(afterLeave)}`,
  );

  // Range select: picking a different trailing window re-slices the data
  // and re-renders the WebGL series — confirm via a real pixel diff of the
  // chart frame (not just reading `<select>.value`).
  await page.mouse.move(20, 20);
  await page.waitForTimeout(150);
  const beforeRangeChange = await pixelSnapshot(page, canvas);

  const rangeSelect = page.locator(`[data-block="${BLOCK}"] select[aria-label="Select date range"]`);
  await rangeSelect.selectOption("7");
  await page.waitForTimeout(800);
  const afterRangeChange = await pixelSnapshot(page, canvas);

  report(
    "chartAreaInteractive:range-select-changes-rendered-shape",
    !beforeRangeChange.equals(afterRangeChange),
    `expected the chart's rendered pixels to differ after switching from 90 days to 7 days (${beforeRangeChange.length} vs ${afterRangeChange.length} bytes)`,
  );

  await page.close();
  await teardown();
}

main()
  .then(() => summarize())
  .catch((error) => {
    console.error(error);
    report("chartAreaInteractive:script-error", false, String(error));
    summarize();
  });
