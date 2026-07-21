// Real browser interaction checks for sidebar08: same nav-main accordion +
// icon-rail collapse contract as sidebar07 (see sidebar05-08-shared.ts's
// `renderExpandableNavRow` + sidebar08.ts's `collapsed` state), plus its own
// "inset" main panel whose margin shrinks in step with the sidebar's own
// collapse transition — verified by checking the main panel's own left edge
// moves closer to the aside once collapsed.
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
  const page = await mountedPage(demoUrl, "sidebar08");
  await locate(page, "sidebar08");

  const playgroundDetails = page
    .locator('[data-block="sidebar08"] aside nav li details')
    .filter({ hasText: "Playground" })
    .first();
  const modelsDetails = page
    .locator('[data-block="sidebar08"] aside nav li details')
    .filter({ hasText: "Models" })
    .first();

  const playgroundOpen = await playgroundDetails.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  const modelsOpenBefore = await modelsDetails.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  report(
    "sidebar08: 'Playground' (has active child 'Starred') starts open, 'Models' starts closed",
    playgroundOpen === true && modelsOpenBefore === false,
    `playgroundOpen=${playgroundOpen} modelsOpen=${modelsOpenBefore}`,
  );

  await modelsDetails.locator("summary").first().click();
  await page.waitForTimeout(150);
  const modelsOpenAfter = await modelsDetails.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  const genesisVisible = await modelsDetails
    .locator("ul li a", { hasText: "Genesis" })
    .first()
    .isVisible();
  report(
    "sidebar08: clicking 'Models' expands it and reveals the 'Genesis' child link",
    modelsOpenAfter === true && genesisVisible === true,
    `open=${modelsOpenAfter} genesisVisible=${genesisVisible}`,
  );

  const aside = page.locator('[data-block="sidebar08"] aside').first();
  const main = page.locator('[data-block="sidebar08"] main').first();
  const toggleButton = page
    .locator('[data-block="sidebar08"] main header button')
    .first();

  const expandedAsideWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  const mainLeftBefore = await main.evaluate(
    (el) => el.getBoundingClientRect().left,
  );

  await toggleButton.click();
  await page.waitForTimeout(300);
  const collapsedAsideWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  const mainLeftAfter = await main.evaluate(
    (el) => el.getBoundingClientRect().left,
  );
  report(
    "sidebar08: the header toggle button collapses the aside to the icon rail",
    collapsedAsideWidth < expandedAsideWidth / 2,
    `expanded=${expandedAsideWidth}px collapsed=${collapsedAsideWidth}px`,
  );
  report(
    "sidebar08: the inset main panel's left edge moves closer to the viewport edge as the sidebar collapses",
    mainLeftAfter < mainLeftBefore,
    `mainLeftBefore=${mainLeftBefore}px mainLeftAfter=${mainLeftAfter}px`,
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const reExpandedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  report(
    "sidebar08: the window-level Ctrl+B shortcut re-expands the aside back to full width",
    reExpandedWidth > collapsedAsideWidth * 2,
    `collapsed=${collapsedAsideWidth}px afterCtrlB=${reExpandedWidth}px`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    report("sidebar08: script ran without throwing", false, String(error));
  })
  .finally(async () => {
    await teardown();
    summarize();
  });
