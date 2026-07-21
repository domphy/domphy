// Real-browser interaction check for chartPieInteractive: hovering a wedge
// shows a real tooltip naming that category, and picking a different
// category from the `<select>` actually grows the newly-selected wedge's
// own path geometry (CSS `d`) while shrinking the previously-selected one,
// and updates the donut's center total text — not just a `<select>.value`
// bookkeeping change.
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

const BLOCK = "chartPieInteractive";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, BLOCK);
  await locate(page, BLOCK);

  const wedges = page.locator(
    `[data-block="${BLOCK}"] g[aria-hidden="true"] path`,
  );
  const wedgeCount = await wedges.count();
  report(
    "chartPieInteractive:renders-wedges",
    wedgeCount === 5,
    `expected 5 donut wedges (Chrome/Safari/Firefox/Edge/Other), got ${wedgeCount}`,
  );

  // `strong` is unique in this tree — pieCenterText's donut total uses an SVG
  // `<text>`, not `<strong>` — so it reliably identifies the tooltip layer.
  // The card's OWN description also renders as a `<small>` though, so the
  // tooltip's name span must be scoped to the same container as `strong`,
  // not looked up page-wide.
  const tooltipText = () =>
    page.evaluate((block) => {
      const root = document.querySelector(`[data-block="${block}"]`);
      const strong = root?.querySelector("strong");
      const layer = strong?.closest(
        "div[aria-hidden='true']",
      ) as HTMLElement | null;
      const small = layer?.querySelector("small");
      return {
        opacity: layer ? getComputedStyle(layer).opacity : null,
        name: small?.textContent ?? "",
        value: strong?.textContent ?? "",
      };
    }, BLOCK);

  const firstWedgeBox = await wedges.first().boundingBox();
  if (!firstWedgeBox) throw new Error("first wedge has no bounding box");
  await page.mouse.move(
    firstWedgeBox.x + firstWedgeBox.width / 2,
    firstWedgeBox.y + firstWedgeBox.height / 2,
    { steps: 5 },
  );
  await page.waitForTimeout(200);
  const hovered = await tooltipText();
  report(
    "chartPieInteractive:hover-shows-wedge-tooltip",
    hovered.opacity === "1" &&
      hovered.name === "Chrome" &&
      hovered.value === "275",
    `expected a visible tooltip naming "Chrome" with value "275" (the first/default DEFAULT_PIE_DATA record) while hovering the first wedge, got ${JSON.stringify(hovered)}`,
  );

  await page.mouse.move(20, 20);
  await page.waitForTimeout(200);

  const readCenterAndWedgeD = () =>
    page.evaluate((block) => {
      const root = document.querySelector(`[data-block="${block}"]`);
      const centerText =
        root?.querySelector("g[aria-hidden='true'] text")?.textContent ?? null;
      const paths = Array.from(
        root?.querySelectorAll("g[aria-hidden='true'] path") ?? [],
      ) as SVGPathElement[];
      return {
        centerText,
        chromeD: paths[0] ? getComputedStyle(paths[0]).d : null,
        firefoxD: paths[2] ? getComputedStyle(paths[2]).d : null,
      };
    }, BLOCK);

  const beforeSelect = await readCenterAndWedgeD();
  report(
    "chartPieInteractive:center-text-shows-default-selection",
    beforeSelect.centerText === "275",
    `expected the donut's center total to read "275" (Chrome, the default selection), got ${beforeSelect.centerText}`,
  );

  const select = page.locator(
    `[data-block="${BLOCK}"] select[aria-label="Select a category"]`,
  );
  await select.selectOption("firefox");
  await page.waitForTimeout(400);
  const afterSelect = await readCenterAndWedgeD();

  report(
    "chartPieInteractive:select-updates-center-text-and-wedge-shapes",
    afterSelect.centerText === "187" &&
      afterSelect.chromeD !== beforeSelect.chromeD &&
      afterSelect.firefoxD !== beforeSelect.firefoxD,
    `expected center total "187" (Firefox) after selecting it, and BOTH the now-deselected Chrome wedge and now-selected Firefox wedge to have a different rendered path ("d") than before; before=${JSON.stringify(beforeSelect)} after=${JSON.stringify(afterSelect)}`,
  );

  await page.close();
  await teardown();
}

main()
  .then(() => summarize())
  .catch((error) => {
    console.error(error);
    report("chartPieInteractive:script-error", false, String(error));
    summarize();
  });
