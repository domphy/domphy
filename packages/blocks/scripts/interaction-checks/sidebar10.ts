// Real browser interaction checks for sidebar10.
//
// NOTE: despite the "calendar sidebar" label in the task brief, sidebar10's
// actual source (src/shadcn/sidebar/sidebar10.ts) is a Notion-style workspace
// sidebar (team switcher, favorites, nested workspace tree) with no calendar
// day-grid or month nav at all — that content lives in sidebar12/sidebarLeftRight
// instead. Tests below drive sidebar10's real interactive elements: expanding
// a workspace's page tree, and revealing overflowed favorites via "More".
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "sidebar10");
    const block = await locate(page, "sidebar10");

    // Workspaces are button+link rows, not <details>. The chevron is
    // hover-revealed (`display:none` until the row is hovered).
    const productToggle = block.locator('button[aria-label="Toggle Product"]');
    const roadmap = block.locator("a", { hasText: "🗺️Roadmap" });
    const expandedBefore = await page.evaluate(() => {
      const button = document.querySelector(
        '[data-block="sidebar10"] button[aria-label="Toggle Product"]',
      );
      return button?.getAttribute("aria-expanded") ?? null;
    });
    await block.locator("a", { hasText: "Product" }).first().hover();
    await productToggle.click({ force: true });
    await page.waitForTimeout(200);
    const expandedAfter = await page.evaluate(() => {
      const button = document.querySelector(
        '[data-block="sidebar10"] button[aria-label="Toggle Product"]',
      );
      return button?.getAttribute("aria-expanded") ?? null;
    });
    const childVisible = await roadmap.isVisible();
    report(
      "sidebar10: clicking a workspace folder expands its page tree",
      expandedBefore === "false" && expandedAfter === "true" && childVisible,
      `aria-expanded ${expandedBefore}->${expandedAfter}, childVisible=${childVisible}`,
    );

    // Favorites list: only 10 of 13 default favorites show initially, plus a
    // real "More" row that reveals the rest.
    const favoritesMore = block.locator("button", { hasText: "More" }).first();
    const hiddenBefore = await block
      .locator("a", { hasText: "Security" })
      .count();
    await favoritesMore.scrollIntoViewIfNeeded();
    await favoritesMore.click();
    await page.waitForTimeout(150);
    const hiddenAfter = await block
      .locator("a", { hasText: "Security" })
      .count();
    report(
      "sidebar10: clicking favorites' More row reveals the overflowed items",
      hiddenBefore === 0 && hiddenAfter === 1,
      `count before=${hiddenBefore} after=${hiddenAfter}`,
    );

    // Header collapse toggle: clicking it should shrink the aside's width.
    const asideElement = block.locator("aside").first();
    const widthBefore = (await asideElement.boundingBox())?.width ?? 0;
    await block.locator('button[aria-label="Toggle sidebar"]').click();
    await page.waitForTimeout(300);
    const widthAfter = (await asideElement.boundingBox())?.width ?? 0;
    report(
      "sidebar10: header toggle collapses the sidebar (width shrinks)",
      widthAfter < widthBefore - 50,
      `width before=${widthBefore} after=${widthAfter}`,
    );
  } finally {
    await teardown();
  }
  summarize();
}

main();
