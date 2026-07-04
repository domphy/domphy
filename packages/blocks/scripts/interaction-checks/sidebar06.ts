// Real browser interaction checks for sidebar06: each top-level nav row is a
// `button` wired to `popover()` (see sidebar06.ts) — clicking it opens a
// floating dropdown of that item's children (reflected via `aria-expanded`
// on the trigger, per @domphy/ui's popover patch), and the block explicitly
// cross-wires every row's open `State` so opening one closes any other that
// was open (only one dropdown at a time). Plus the same fully-hides (not
// icon-rail) toggle button as sidebar05.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "sidebar06");
  await locate(page, "sidebar06");

  const playgroundButton = page
    .locator('[data-block="sidebar06"] aside nav button')
    .filter({ hasText: "Playground" })
    .first();
  const modelsButton = page
    .locator('[data-block="sidebar06"] aside nav button')
    .filter({ hasText: "Models" })
    .first();

  const initialExpanded = await playgroundButton.getAttribute("aria-expanded");
  report(
    "sidebar06: 'Playground' dropdown starts closed (aria-expanded=false)",
    initialExpanded === "false",
    `aria-expanded=${initialExpanded}`,
  );

  await playgroundButton.click();
  await page.waitForTimeout(150);
  const afterClickExpanded = await playgroundButton.getAttribute("aria-expanded");
  report(
    "sidebar06: clicking 'Playground' opens its floating dropdown",
    afterClickExpanded === "true",
    `aria-expanded=${afterClickExpanded}`,
  );

  const historyItemVisible = await page.locator('[role="dialog"]', { hasText: "History" }).first().isVisible();
  report(
    "sidebar06: the open dropdown shows 'Playground's child items (e.g. 'History')",
    historyItemVisible === true,
    `visible=${historyItemVisible}`,
  );

  await modelsButton.click();
  await page.waitForTimeout(150);
  const playgroundAfterModelsClick = await playgroundButton.getAttribute("aria-expanded");
  const modelsExpanded = await modelsButton.getAttribute("aria-expanded");
  report(
    "sidebar06: opening 'Models' closes the previously-open 'Playground' dropdown (only one open at a time)",
    playgroundAfterModelsClick === "false" && modelsExpanded === "true",
    `playgroundExpanded=${playgroundAfterModelsClick} modelsExpanded=${modelsExpanded}`,
  );

  const aside = page.locator('[data-block="sidebar06"] aside').first();
  const toggleButton = page.locator('[data-block="sidebar06"] main header button').first();
  const expandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  await toggleButton.click();
  await page.waitForTimeout(300);
  const collapsedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar06: the header toggle button fully collapses the sidebar (width -> ~0)",
    expandedWidth > 200 && collapsedWidth < 5,
    `expanded=${expandedWidth}px collapsed=${collapsedWidth}px`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    report("sidebar06: script ran without throwing", false, String(error));
  })
  .finally(async () => {
    await teardown();
    summarize();
  });
