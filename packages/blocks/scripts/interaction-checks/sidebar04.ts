// Real browser interaction checks for sidebar04. Unlike the other parent/child
// sidebars, upstream sidebar-04 renders each top-level entry as a plain BOLD
// link with its sub-list ALWAYS visible (no <details> disclosure), inside a
// floating (inset, wider — SIDEBAR_WIDTH_FLOATING = themeSpacing(76) ≈ 304px)
// panel with a non-sticky content header. Verifies the flat always-open nav
// plus the icon-rail toggle + Ctrl/Cmd+B shortcut work with the floating layout.
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "sidebar04");
  await locate(page, "sidebar04");

  const nav = page.locator('[data-block="sidebar04"] aside nav').first();

  const detailsCount = await nav.locator("details").count();
  report(
    "sidebar04: nav uses no <details> disclosure widgets (upstream renders flat, always-open sub-lists)",
    detailsCount === 0,
    `detailsCount=${detailsCount}`,
  );

  // The active child link ("Data Fetching") is visible with no interaction,
  // because the parent's sub-list is not collapsed behind a disclosure.
  const activeChild = nav.locator("a", { hasText: "Data Fetching" }).first();
  const activeChildVisible = await activeChild.isVisible();
  report(
    "sidebar04: a child link is visible immediately (sub-list is always open, not gated by a click)",
    activeChildVisible === true,
    `activeChildVisible=${activeChildVisible}`,
  );

  // Top-level entries are bold links (a <strong> label inside the <a>).
  const parentBold = await nav
    .locator("li > a strong", { hasText: "Build Your Application" })
    .first()
    .count();
  report(
    "sidebar04: top-level entries render as bold plain links",
    parentBold > 0,
    `boldParentMatches=${parentBold}`,
  );

  const aside = page.locator('[data-block="sidebar04"] aside').first();
  const toggleButton = page
    .locator('[data-block="sidebar04"] main header button')
    .first();
  const expandedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  report(
    "sidebar04: the floating aside's expanded width is wider than the docked variants (~304px)",
    expandedWidth > 280 && expandedWidth < 340,
    `expandedWidth=${expandedWidth}px`,
  );

  await toggleButton.click();
  await page.waitForTimeout(300);
  const collapsedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  report(
    "sidebar04: the header toggle button collapses the aside to the icon rail",
    collapsedWidth < expandedWidth / 2,
    `expanded=${expandedWidth}px collapsed=${collapsedWidth}px`,
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const reExpandedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
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
