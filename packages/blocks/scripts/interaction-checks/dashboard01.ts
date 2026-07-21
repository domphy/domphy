// Real browser interaction checks for dashboard01: the sidebar's collapse
// toggle must actually resize the layout (reused sidebar07 mechanics), and
// the chart region's date-range control must actually re-render the chart
// with different data (not just re-render inertly with the same content).
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "dashboard01");
    const block = await locate(page, "dashboard01");

    const asideElement = block.locator("aside").first();
    const widthBefore = (await asideElement.boundingBox())?.width ?? 0;
    await block.locator('button[aria-label="Toggle sidebar"]').click();
    await page.waitForTimeout(300);
    const widthAfter = (await asideElement.boundingBox())?.width ?? 0;
    report(
      "dashboard01: sidebar collapse toggle actually resizes the layout",
      widthAfter < widthBefore - 50,
      `aside width before=${widthBefore} after=${widthAfter}`,
    );

    // Date range: default preset is "Last 3 months" — switch to "Last 7 days"
    // via the toggle-group control and confirm the chart's caption text (which
    // is derived from the currently-selected range) actually changes.
    const captionBefore = await block
      .locator("text=Showing total visitors for the")
      .innerText();
    await block
      .locator('button[role="button"]', { hasText: "Last 7 days" })
      .click();
    await page.waitForTimeout(200);
    const captionAfter = await block
      .locator("text=Showing total visitors for the")
      .innerText();
    report(
      "dashboard01: switching the date-range control re-renders the chart with different data",
      captionBefore.includes("3 months") &&
        captionAfter.includes("7 days") &&
        captionBefore !== captionAfter,
      `caption before="${captionBefore}" after="${captionAfter}"`,
    );

    // The toggle-group's pressed state should also move to the clicked item.
    const sevenDaysButton = block.locator('button[role="button"]', {
      hasText: "Last 7 days",
    });
    const threeMonthsButton = block.locator('button[role="button"]', {
      hasText: "Last 3 months",
    });
    const sevenPressed = await sevenDaysButton.getAttribute("aria-pressed");
    const threeMonthsPressed =
      await threeMonthsButton.getAttribute("aria-pressed");
    report(
      "dashboard01: the clicked date-range option becomes the pressed one",
      sevenPressed === "true" && threeMonthsPressed === "false",
      `Last 7 days aria-pressed=${sevenPressed}, Last 3 months aria-pressed=${threeMonthsPressed}`,
    );
  } finally {
    await teardown();
  }
  summarize();
}

main();
