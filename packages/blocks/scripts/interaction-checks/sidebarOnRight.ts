// Real browser interaction checks for sidebarOnRight: same collapse-toggle
// pattern as the sidebar05-08 family — the header's panel-toggle button (and
// its Cmd/Ctrl+B shortcut) must actually change the sidebar's width. This
// variant docks the sidebar to the right edge, but the toggle mechanics
// (shared via sidebar01-04-shared.ts's buildSidebarBlock) are the same.
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
    const page = await mountedPage(demoUrl, "sidebarOnRight");
    const block = await locate(page, "sidebarOnRight");

    const asideElement = block.locator("aside").first();
    const widthBefore = (await asideElement.boundingBox())?.width ?? 0;

    await block.locator('button[aria-label="Toggle sidebar"]').click();
    await page.waitForTimeout(300);
    const widthAfterToggle = (await asideElement.boundingBox())?.width ?? 0;
    report(
      "sidebarOnRight: header toggle button collapses the sidebar (width shrinks)",
      widthAfterToggle < widthBefore - 50,
      `width before=${widthBefore} after=${widthAfterToggle}`,
    );

    // Ctrl/Cmd+B keyboard shortcut should toggle it back open.
    await page.keyboard.press("Control+b");
    await page.waitForTimeout(300);
    const widthAfterShortcut = (await asideElement.boundingBox())?.width ?? 0;
    report(
      "sidebarOnRight: Ctrl+B shortcut expands the sidebar back",
      widthAfterShortcut > widthAfterToggle + 50,
      `width after shortcut=${widthAfterShortcut} (was ${widthAfterToggle})`,
    );
  } finally {
    await teardown();
  }
  summarize();
}

main();
