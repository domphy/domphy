// Real browser check for pathMorph: click the toggle button and assert the
// SVG path `d` attribute actually changes between the pause/play states
// (both paths, since each bar morphs independently), and that toggling back
// restores the original path data.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "pathMorph";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);
    const button = block.locator("button").first();
    const paths = block.locator("path");

    const labelBefore = await button.getAttribute("aria-label");
    const pathsBefore = await paths.evaluateAll((elements) => elements.map((el) => el.getAttribute("d")));

    await button.click();
    await page.waitForTimeout(350);

    const labelAfterClick = await button.getAttribute("aria-label");
    const pathsAfterClick = await paths.evaluateAll((elements) => elements.map((el) => el.getAttribute("d")));

    report(
      `${NAME}: clicking toggles the aria-label between Pause/Play`,
      labelBefore === "Pause" && labelAfterClick === "Play",
      `label before="${labelBefore}", after click="${labelAfterClick}"`,
    );

    const bothPathsChanged = pathsBefore.every((value, index) => value !== pathsAfterClick[index]);
    report(
      `${NAME}: clicking actually morphs both SVG path "d" attributes (pause bars -> play triangle)`,
      bothPathsChanged,
      `before=${JSON.stringify(pathsBefore)}, after=${JSON.stringify(pathsAfterClick)}`,
    );

    await button.click();
    await page.waitForTimeout(350);
    const pathsAfterToggleBack = await paths.evaluateAll((elements) => elements.map((el) => el.getAttribute("d")));
    report(
      `${NAME}: toggling back morphs the path data back to the original pause-bar shape`,
      JSON.stringify(pathsAfterToggleBack) === JSON.stringify(pathsBefore),
      `after toggling back=${JSON.stringify(pathsAfterToggleBack)}, original=${JSON.stringify(pathsBefore)}`,
    );

    await page.close();
  } finally {
    await teardown();
  }
}

main()
  .catch((error) => {
    console.error(error);
    report(`${NAME}: unexpected error`, false, String(error));
  })
  .finally(() => summarize());
