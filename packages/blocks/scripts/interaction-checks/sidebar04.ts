// Real browser interaction checks for sidebar04: same parent/child nav tree
// as sidebar03 (see sidebar01-04-shared.ts), but floating (inset, wider —
// SIDEBAR_WIDTH_FLOATING = themeSpacing(76) ≈ 304px vs sidebar03's ≈256px)
// and its content header isn't sticky (`stickyHeader: false`). Verifies the
// same parent-<details> expand contract plus the icon-rail toggle + Ctrl/Cmd+B
// shortcut still work with the floating layout.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "sidebar04");
  await locate(page, "sidebar04");

  const salesDetails = page
    .locator('[data-block="sidebar04"] aside nav li details')
    .filter({ hasText: "Sales & Marketing" })
    .first();
  const salesSummary = salesDetails.locator("summary").first();

  const initiallyOpen = await salesDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  report(
    "sidebar04: 'Sales & Marketing' group (no active child) starts closed",
    initiallyOpen === false,
    `open=${initiallyOpen}`,
  );

  await salesSummary.click();
  await page.waitForTimeout(150);
  const afterClickOpen = await salesDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  const campaignsVisible = await salesDetails.locator("ul li a", { hasText: "Campaigns" }).first().isVisible();
  report(
    "sidebar04: clicking 'Sales & Marketing' expands it and reveals the 'Campaigns' child link",
    afterClickOpen === true && campaignsVisible === true,
    `open=${afterClickOpen} campaignsVisible=${campaignsVisible}`,
  );

  await salesSummary.click();
  await page.waitForTimeout(150);
  const afterSecondClickOpen = await salesDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  report(
    "sidebar04: clicking it again collapses the group back closed",
    afterSecondClickOpen === false,
    `open=${afterSecondClickOpen}`,
  );

  const aside = page.locator('[data-block="sidebar04"] aside').first();
  const toggleButton = page.locator('[data-block="sidebar04"] main header button').first();
  const expandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar04: the floating aside's expanded width is wider than the docked variants (~304px)",
    expandedWidth > 280 && expandedWidth < 340,
    `expandedWidth=${expandedWidth}px`,
  );

  await toggleButton.click();
  await page.waitForTimeout(300);
  const collapsedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar04: the header toggle button collapses the aside to the icon rail",
    collapsedWidth < expandedWidth / 2,
    `expanded=${expandedWidth}px collapsed=${collapsedWidth}px`,
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const reExpandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar04: Ctrl+B re-expands the aside back to full width",
    reExpandedWidth > collapsedWidth * 2,
    `collapsed=${collapsedWidth}px afterCtrlB=${reExpandedWidth}px`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    report("sidebar04: script ran without throwing", false, String(error));
  })
  .finally(async () => {
    await teardown();
    summarize();
  });
