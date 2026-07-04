// Real browser interaction checks for sidebarLeftRight: same collapse-toggle
// pattern as the sidebar05-08 family — the header's panel-toggle button (and
// its Cmd/Ctrl+B shortcut) must actually change the left sidebar's width.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "sidebarLeftRight");
    const block = await locate(page, "sidebarLeftRight");

    const leftAside = block.locator("aside").first();
    const widthBefore = (await leftAside.boundingBox())?.width ?? 0;

    await block.locator('button[aria-label="Toggle sidebar"]').click();
    await page.waitForTimeout(300);
    const widthAfterToggle = (await leftAside.boundingBox())?.width ?? 0;
    report(
      "sidebarLeftRight: header toggle button collapses the left sidebar (width shrinks)",
      widthAfterToggle < widthBefore - 50,
      `width before=${widthBefore} after=${widthAfterToggle}`,
    );

    // Ctrl/Cmd+B keyboard shortcut should toggle it back open.
    await page.keyboard.press("Control+b");
    await page.waitForTimeout(300);
    const widthAfterShortcut = (await leftAside.boundingBox())?.width ?? 0;
    report(
      "sidebarLeftRight: Ctrl+B shortcut expands the left sidebar back",
      widthAfterShortcut > widthAfterToggle + 50,
      `width after shortcut=${widthAfterShortcut} (was ${widthAfterToggle})`,
    );
  } finally {
    await teardown();
  }
  summarize();
}

main();
