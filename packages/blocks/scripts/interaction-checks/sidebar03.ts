// Real browser interaction checks for sidebar03: top-level nav items that
// carry a `children` array render as a `<details>` disclosure (see
// sidebar01-04-shared.ts's `navItemWithChildrenRow`) — clicking the parent
// row's summary reveals its indented sub-list. `DEFAULT_NAV_GROUPS_WITH_CHILDREN`
// only auto-opens a group when the item itself (or one of its children) is
// `active` — "Design Engineering" (child "Explorer" active) starts open,
// "Sales & Marketing" and "Travel" start closed. Plus the same icon-rail
// toggle button + Ctrl/Cmd+B shortcut as sidebar01/02.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "sidebar03");
  await locate(page, "sidebar03");

  const travelDetails = page
    .locator('[data-block="sidebar03"] aside nav li details')
    .filter({ hasText: "Travel" })
    .first();
  const travelSummary = travelDetails.locator("summary").first();

  const initiallyOpen = await travelDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  report(
    "sidebar03: 'Travel' group (no active child) starts closed",
    initiallyOpen === false,
    `open=${initiallyOpen}`,
  );

  const childrenVisibleBefore = await travelDetails.locator("ul li a", { hasText: "Trips" }).first().isVisible();
  report(
    "sidebar03: 'Trips' child link is not visible before expanding",
    childrenVisibleBefore === false,
    `visible=${childrenVisibleBefore}`,
  );

  await travelSummary.click();
  await page.waitForTimeout(150);
  const afterClickOpen = await travelDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  const childrenVisibleAfter = await travelDetails.locator("ul li a", { hasText: "Trips" }).first().isVisible();
  report(
    "sidebar03: clicking 'Travel' expands it and reveals the 'Trips' child link",
    afterClickOpen === true && childrenVisibleAfter === true,
    `open=${afterClickOpen} tripsVisible=${childrenVisibleAfter}`,
  );

  const designDetails = page
    .locator('[data-block="sidebar03"] aside nav li details')
    .filter({ hasText: "Design Engineering" })
    .first();
  const designOpen = await designDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  report(
    "sidebar03: 'Design Engineering' (has an active child) starts open",
    designOpen === true,
    `open=${designOpen}`,
  );

  const aside = page.locator('[data-block="sidebar03"] aside').first();
  const toggleButton = page.locator('[data-block="sidebar03"] main header button').first();
  const expandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  await toggleButton.click();
  await page.waitForTimeout(300);
  const collapsedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar03: the header toggle button collapses the aside to the icon rail",
    collapsedWidth < expandedWidth / 2,
    `expanded=${expandedWidth}px collapsed=${collapsedWidth}px`,
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const reExpandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar03: Ctrl+B re-expands the aside back to full width",
    reExpandedWidth > collapsedWidth * 2,
    `collapsed=${collapsedWidth}px afterCtrlB=${reExpandedWidth}px`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    report("sidebar03: script ran without throwing", false, String(error));
  })
  .finally(async () => {
    await teardown();
    summarize();
  });
