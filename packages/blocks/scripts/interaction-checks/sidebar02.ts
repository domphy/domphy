// Real browser interaction checks for sidebar02: each nav section header is
// its own native `<details>` disclosure (see sidebar01-04-shared.ts's
// `navGroupSection`, used when `collapsibleSections: true`) — clicking the
// group's `<summary>` toggles that group open/closed independently of its
// siblings, with no JS handler involved (pure native `<details>` behavior).
// Plus the same icon-rail toggle button + Ctrl/Cmd+B shortcut as sidebar01.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "sidebar02");
  await locate(page, "sidebar02");

  // "Platform" is the first nav group — DEFAULT_NAV_GROUPS has no
  // `defaultOpen: false`, so every group's <details> starts open.
  const platformDetails = page
    .locator('[data-block="sidebar02"] aside nav details')
    .filter({ hasText: "Platform" })
    .first();
  const platformSummary = platformDetails.locator("summary").first();

  const initiallyOpen = await platformDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  report("sidebar02: 'Platform' nav group starts open (defaultOpen unset)", initiallyOpen === true, `open=${initiallyOpen}`);

  await platformSummary.click();
  await page.waitForTimeout(150);
  const afterFirstClick = await platformDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  report(
    "sidebar02: clicking the 'Platform' summary closes the group",
    afterFirstClick === false,
    `open=${afterFirstClick}`,
  );

  await platformSummary.click();
  await page.waitForTimeout(150);
  const afterSecondClick = await platformDetails.evaluate((el) => (el as HTMLDetailsElement).open);
  report(
    "sidebar02: clicking it again re-opens the group",
    afterSecondClick === true,
    `open=${afterSecondClick}`,
  );

  const aside = page.locator('[data-block="sidebar02"] aside').first();
  const toggleButton = page.locator('[data-block="sidebar02"] main header button').first();
  const expandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  await toggleButton.click();
  await page.waitForTimeout(300);
  const collapsedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar02: the header toggle button collapses the aside to the icon rail",
    collapsedWidth < expandedWidth / 2,
    `expanded=${expandedWidth}px collapsed=${collapsedWidth}px`,
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const reExpandedWidth = await aside.evaluate((el) => el.getBoundingClientRect().width);
  report(
    "sidebar02: Ctrl+B re-expands the aside back to full width",
    reExpandedWidth > collapsedWidth * 2,
    `collapsed=${collapsedWidth}px afterCtrlB=${reExpandedWidth}px`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    report("sidebar02: script ran without throwing", false, String(error));
  })
  .finally(async () => {
    await teardown();
    summarize();
  });
