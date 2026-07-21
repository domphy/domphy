// Real browser interaction checks for sidebarStickyHeader: nav-main
// expand/collapse via <details> (renderExpandableNavRow, shared with
// sidebar07/08), the icon-rail collapse driven by the site header's toggle
// button + a window-level Ctrl/Cmd+B shortcut, and — the one thing unique to
// this variant — whether the `position: fixed` site header (a sibling of the
// aside/main row, offset via a `--siteHeaderHeight` custom property) actually
// stays pinned to the top of its own card while the main content column
// scrolls internally underneath it.
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
  const page = await mountedPage(demoUrl, "sidebarStickyHeader");
  await locate(page, "sidebarStickyHeader");

  // --- nav-main <details> accordion -----------------------------------
  const playgroundDetails = page
    .locator('[data-block="sidebarStickyHeader"] aside nav li details')
    .filter({ hasText: "Playground" })
    .first();
  const modelsDetails = page
    .locator('[data-block="sidebarStickyHeader"] aside nav li details')
    .filter({ hasText: "Models" })
    .first();

  const playgroundOpen = await playgroundDetails.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  const modelsOpenBefore = await modelsDetails.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  report(
    "sidebarStickyHeader: 'Playground' (has active child 'Starred') starts open, 'Models' starts closed",
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
    "sidebarStickyHeader: clicking 'Models' expands it and reveals the 'Genesis' child link",
    modelsOpenAfter === true && genesisVisible === true,
    `open=${modelsOpenAfter} genesisVisible=${genesisVisible}`,
  );

  // --- icon-rail collapse: site header toggle button + window Ctrl/Cmd+B --
  const aside = page
    .locator('[data-block="sidebarStickyHeader"] aside')
    .first();
  const toggleButton = page
    .locator('[data-block="sidebarStickyHeader"] header button')
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
    "sidebarStickyHeader: the site header's toggle button collapses the aside to the icon rail",
    collapsedWidth < expandedWidth / 2,
    `expanded=${expandedWidth}px collapsed=${collapsedWidth}px`,
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const reExpandedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  report(
    "sidebarStickyHeader: the window-level Ctrl+B shortcut re-expands the aside back to full width",
    reExpandedWidth > collapsedWidth * 2,
    `collapsed=${collapsedWidth}px afterCtrlB=${reExpandedWidth}px`,
  );

  // --- the site header actually stays pinned while `main` scrolls -------
  // `main`'s own style sets `overflow: "auto"` (see sidebarStickyHeader.ts's
  // `mainElement`) — that's the real internal scroll region, sized by the
  // row above it to `calc(100dvh - var(--siteHeaderHeight))`. The default
  // demo content doesn't have enough rows to actually overflow that box, so
  // append extra filler rows (the same kind of content `sidebarMainContent`
  // would render with more data) to force a genuine scrollbar, then verify
  // scrolling it for real (mouse wheel) moves the content but not the
  // `position: fixed` header sitting outside/above `main` as a sibling.
  const headerLocator = page
    .locator('[data-block="sidebarStickyHeader"] header')
    .first();
  const headerTopBefore = await headerLocator.evaluate(
    (el) => el.getBoundingClientRect().top,
  );

  await page.evaluate(() => {
    const wrapper = document.querySelector(
      '[data-block="sidebarStickyHeader"]',
    ) as HTMLElement;
    const mainElement = wrapper.querySelector("main") as HTMLElement;
    for (let index = 0; index < 40; index += 1) {
      const filler = document.createElement("div");
      filler.style.height = "60px";
      filler.style.flexShrink = "0";
      filler.textContent = `filler-${index}`;
      mainElement.appendChild(filler);
    }
  });
  await page.waitForTimeout(150);

  const mainLocator = page
    .locator('[data-block="sidebarStickyHeader"] main')
    .first();
  const mainBox = await mainLocator.boundingBox();
  if (mainBox) {
    await page.mouse.move(
      mainBox.x + mainBox.width / 2,
      mainBox.y + mainBox.height / 2,
    );
    await page.mouse.wheel(0, 400);
  }
  await page.waitForTimeout(300);

  const mainScrollTop = await mainLocator.evaluate((el) => el.scrollTop);
  const headerTopAfter = await headerLocator.evaluate(
    (el) => el.getBoundingClientRect().top,
  );
  report(
    "sidebarStickyHeader: scrolling `main` internally moves its content but the fixed site header stays pinned in place",
    mainScrollTop > 0 && headerTopAfter === headerTopBefore,
    `mainScrollTop=${mainScrollTop} headerTopBefore=${headerTopBefore} headerTopAfter=${headerTopAfter}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    report(
      "sidebarStickyHeader: script ran without throwing",
      false,
      String(error),
    );
  })
  .finally(async () => {
    await teardown();
    summarize();
  });
