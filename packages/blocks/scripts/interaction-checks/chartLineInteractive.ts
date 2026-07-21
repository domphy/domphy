// Real-browser interaction check for chartLineInteractive: hovering the
// plot shows a real per-point tooltip, and clicking the other header stat
// tile actually swaps which series is plotted — confirmed via the
// `data-active` attribute flipping AND a real pixel diff of the re-rendered
// line (not just reading back whatever prop was passed in).
import {
  boot,
  locate,
  mountedPage,
  pixelSnapshot,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

const BLOCK = "chartLineInteractive";
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
      return element
        ? {
            opacity: getComputedStyle(element).opacity,
            text: element.innerText,
          }
        : null;
    }, TOOLTIP_SELECTOR);

  await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 5 });
  await page.waitForTimeout(200);
  const atLeftEdge = await tooltipInfo();

  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, {
    steps: 15,
  });
  await page.waitForTimeout(200);
  const atRightEdge = await tooltipInfo();

  report(
    "chartLineInteractive:hover-shows-per-point-tooltip",
    atLeftEdge?.opacity === "1" &&
      atRightEdge?.opacity === "1" &&
      /Views:/.test(atLeftEdge?.text ?? "") &&
      atLeftEdge?.text !== atRightEdge?.text,
    `expected a visible tooltip with a "Views:" value, DIFFERENT at the two plot edges (proving it tracks the hovered day); left=${JSON.stringify(atLeftEdge)} right=${JSON.stringify(atRightEdge)}`,
  );

  // Series switch: clicking the "Mobile" stat tile should flip data-active
  // on both tiles and re-render a differently-shaped line.
  await page.mouse.move(20, 20);
  await page.waitForTimeout(150);
  const beforeSwitch = await pixelSnapshot(page, canvas);
  const activeBefore = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        `[data-block="chartLineInteractive"] button[data-active]`,
      ),
    ).map((element) => element.getAttribute("data-active")),
  );

  const mobileTile = page.locator(`[data-block="${BLOCK}"] button`, {
    hasText: "Mobile",
  });
  await mobileTile.click();
  await page.waitForTimeout(700);

  const activeAfter = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        `[data-block="chartLineInteractive"] button[data-active]`,
      ),
    ).map((element) => element.getAttribute("data-active")),
  );
  const afterSwitch = await pixelSnapshot(page, canvas);

  report(
    "chartLineInteractive:click-stat-tile-flips-active-state",
    JSON.stringify(activeBefore) !== JSON.stringify(activeAfter) &&
      activeAfter.includes("true"),
    `expected data-active to flip between the two stat tiles after clicking "Mobile"; before=${JSON.stringify(activeBefore)} after=${JSON.stringify(activeAfter)}`,
  );
  report(
    "chartLineInteractive:series-switch-changes-rendered-line",
    !beforeSwitch.equals(afterSwitch),
    `expected the rendered line pixels to differ after switching from Desktop to Mobile series (${beforeSwitch.length} vs ${afterSwitch.length} bytes)`,
  );

  await page.close();
  await teardown();
}

main()
  .then(() => summarize())
  .catch((error) => {
    console.error(error);
    report("chartLineInteractive:script-error", false, String(error));
    summarize();
  });
