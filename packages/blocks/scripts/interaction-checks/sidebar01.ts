// Real browser interaction checks for sidebar01: icon-rail collapse via the
// content header's toggle button, and the ctrl/cmd+B keyboard shortcut that
// drives the same `collapsed` state (see sidebar01-04-shared.ts's
// `sidebarToggleButton`). sidebar01 itself has no collapsible nav groups (its
// `navGroupList` branch for `collapsibleSections: false` renders a plain
// label + `<ul>`, not a `<details>`), so those two toggle paths are the only
// real interactive contract this variant has.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "sidebar01");
  await locate(page, "sidebar01");

  const aside = page.locator('[data-block="sidebar01"] aside').first();
  const toggleButton = page.locator('[data-block="sidebar01"] main header button').first();

  const expandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);

  await toggleButton.click();
  await page.waitForTimeout(300);
  const collapsedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar01: clicking the header toggle button collapses the aside to the icon rail",
    collapsedWidth < expandedWidth / 2,
    `expanded=${expandedWidth}px collapsed=${collapsedWidth}px`,
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const reExpandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar01: Ctrl+B re-expands the aside back to full width",
    reExpandedWidth > collapsedWidth * 2,
    `collapsed=${collapsedWidth}px afterCtrlB=${reExpandedWidth}px`,
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const collapsedAgainWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar01: a second Ctrl+B collapses it again (shortcut toggles both ways)",
    collapsedAgainWidth < reExpandedWidth / 2,
    `reExpanded=${reExpandedWidth}px afterSecondCtrlB=${collapsedAgainWidth}px`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    report("sidebar01: script ran without throwing", false, String(error));
  })
  .finally(async () => {
    await teardown();
    summarize();
  });
