// Real browser interaction checks for sidebar05: each top-level nav group is
// its own `<details>` (see `renderNavGroup` in sidebar05.ts) with a
// plus/minus glyph swapped purely via the `[open]` CSS attribute selector —
// clicking the summary natively toggles `open`, and multiple groups can stay
// open at once (no cross-closing). "Getting Started" starts open
// (`defaultOpen: true`), the rest start closed. The sidebar itself has no
// icon-rail collapse — its own toggle button (in the shared sticky content
// header) fully hides it (width -> 0), not a Ctrl/Cmd+B shortcut (none is
// wired for this variant).
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
  const page = await mountedPage(demoUrl, "sidebar05");
  await locate(page, "sidebar05");

  const gettingStarted = page
    .locator('[data-block="sidebar05"] aside nav li details')
    .filter({ hasText: "Getting Started" })
    .first();
  const building = page
    .locator('[data-block="sidebar05"] aside nav li details')
    .filter({ hasText: "Building Your Application" })
    .first();

  const gettingStartedOpen = await gettingStarted.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  const buildingOpenBefore = await building.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  report(
    "sidebar05: 'Getting Started' starts open (defaultOpen: true), 'Building Your Application' starts closed",
    gettingStartedOpen === true && buildingOpenBefore === false,
    `gettingStartedOpen=${gettingStartedOpen} buildingOpen=${buildingOpenBefore}`,
  );

  await building.locator("summary").first().click();
  await page.waitForTimeout(150);
  const buildingOpenAfter = await building.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  const gettingStartedStillOpen = await gettingStarted.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  report(
    "sidebar05: opening 'Building Your Application' does not close the already-open 'Getting Started' (independent accordions)",
    buildingOpenAfter === true && gettingStartedStillOpen === true,
    `buildingOpen=${buildingOpenAfter} gettingStartedOpen=${gettingStartedStillOpen}`,
  );

  const routingVisible = await building
    .locator("ul li a", { hasText: "Routing" })
    .first()
    .isVisible();
  report(
    "sidebar05: the newly-opened group's 'Routing' child link is now visible",
    routingVisible === true,
    `visible=${routingVisible}`,
  );

  const aside = page.locator('[data-block="sidebar05"] aside').first();
  const toggleButton = page
    .locator('[data-block="sidebar05"] main header button')
    .first();
  const expandedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  await toggleButton.click();
  await page.waitForTimeout(300);
  const collapsedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  report(
    "sidebar05: the header toggle button fully collapses the sidebar (width -> ~0), not to an icon rail",
    expandedWidth > 200 && collapsedWidth < 5,
    `expanded=${expandedWidth}px collapsed=${collapsedWidth}px`,
  );

  await toggleButton.click();
  await page.waitForTimeout(300);
  const reExpandedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  report(
    "sidebar05: clicking the toggle button again restores the full width",
    reExpandedWidth > 200,
    `reExpandedWidth=${reExpandedWidth}px`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    report("sidebar05: script ran without throwing", false, String(error));
  })
  .finally(async () => {
    await teardown();
    summarize();
  });
