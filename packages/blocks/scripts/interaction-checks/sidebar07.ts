// Real browser interaction checks for sidebar07: nav-main items with
// `items` render as `<details>` accordions (see `renderExpandableNavRow` in
// sidebar05-08-shared.ts) — "Playground" starts open because its child
// "Starred" is `active`, "Models" (no active child) starts closed until
// clicked. The full-featured icon-rail collapse (`collapsed` state) is
// driven by three independent triggers per sidebar07.ts: the sticky header's
// toggle button, and a window-level Ctrl/Cmd+B keydown listener — verified
// here alongside the accordion contract.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "sidebar07");
  await locate(page, "sidebar07");

  const playgroundDetails = page
    .locator('[data-block="sidebar07"] aside nav li details')
    .filter({ hasText: "Playground" })
    .first();
  const modelsDetails = page
    .locator('[data-block="sidebar07"] aside nav li details')
    .filter({ hasText: "Models" })
    .first();

  const playgroundOpen = await playgroundDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  const modelsOpenBefore = await modelsDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  report(
    "sidebar07: 'Playground' (has active child 'Starred') starts open, 'Models' starts closed",
    playgroundOpen === true && modelsOpenBefore === false,
    `playgroundOpen=${playgroundOpen} modelsOpen=${modelsOpenBefore}`,
  );

  await modelsDetails.locator("summary").first().click();
  await page.waitForTimeout(150);
  const modelsOpenAfter = await modelsDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  const genesisVisible = await modelsDetails.locator("ul li a", { hasText: "Genesis" }).first().isVisible();
  report(
    "sidebar07: clicking 'Models' expands it and reveals the 'Genesis' child link",
    modelsOpenAfter === true && genesisVisible === true,
    `open=${modelsOpenAfter} genesisVisible=${genesisVisible}`,
  );

  const aside = page.locator('[data-block="sidebar07"] aside').first();
  const toggleButton = page.locator('[data-block="sidebar07"] main header button').first();
  const expandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  await toggleButton.click();
  await page.waitForTimeout(300);
  const collapsedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar07: the sticky header's toggle button collapses the aside to the icon rail",
    collapsedWidth < expandedWidth / 2,
    `expanded=${expandedWidth}px collapsed=${collapsedWidth}px`,
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const reExpandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar07: the window-level Ctrl+B shortcut re-expands the aside back to full width",
    reExpandedWidth > collapsedWidth * 2,
    `collapsed=${collapsedWidth}px afterCtrlB=${reExpandedWidth}px`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    report("sidebar07: script ran without throwing", false, String(error));
  })
  .finally(async () => {
    await teardown();
    summarize();
  });
