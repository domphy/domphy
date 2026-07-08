// Real browser interaction checks for sidebar03. Upstream sidebar-03 is
// structurally identical to sidebar-04 (a static docs header, a flat nav whose
// top-level entries are bold links with ALWAYS-visible sub-lists, no <details>
// disclosure) but rendered flush (standard variant) rather than as a floating
// inset card. Verifies the flat always-open nav plus the icon-rail toggle +
// Ctrl/Cmd+B shortcut.
import {
  boot,
  locate,
  report,
  summarize,
  teardown,
  mountedPage,
} from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "sidebar03");
  await locate(page, "sidebar03");

  const nav = page.locator('[data-block="sidebar03"] aside nav').first();

  const detailsCount = await nav.locator("details").count();
  report(
    "sidebar03: nav uses no <details> disclosure widgets (upstream renders flat, always-open sub-lists)",
    detailsCount === 0,
    `detailsCount=${detailsCount}`,
  );

  // The active child link ("Data Fetching") is visible with no interaction,
  // because the parent's sub-list is not collapsed behind a disclosure.
  const activeChild = nav.locator("a", { hasText: "Data Fetching" }).first();
  const activeChildVisible = await activeChild.isVisible();
  report(
    "sidebar03: a child link is visible immediately (sub-list is always open, not gated by a click)",
    activeChildVisible === true,
    `activeChildVisible=${activeChildVisible}`,
  );

  // Top-level entries are bold links (a <strong> label inside the <a>).
  const parentBold = await nav
    .locator("li > a strong", { hasText: "Build Your Application" })
    .first()
    .count();
  report(
    "sidebar03: top-level entries render as bold plain links",
    parentBold > 0,
    `boldParentMatches=${parentBold}`,
  );

  const aside = page.locator('[data-block="sidebar03"] aside').first();
  const toggleButton = page
    .locator('[data-block="sidebar03"] main header button')
    .first();
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
