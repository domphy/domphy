// Real browser interaction checks for hoverSidebar: hovering the collapsed
// icon rail must actually expand it (width increases), and moving the mouse
// away must actually collapse it back.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "hoverSidebar");
    const block = await locate(page, "hoverSidebar");

    const railElement = block.locator('aside[aria-label="Primary navigation"]');
    const widthCollapsed = (await railElement.boundingBox())?.width ?? 0;

    await railElement.hover();
    // The rail's own width transition is 250ms; give it room to settle.
    await page.waitForTimeout(400);
    const widthExpanded = (await railElement.boundingBox())?.width ?? 0;
    report(
      "hoverSidebar: hovering the collapsed rail expands it (width increases)",
      widthExpanded > widthCollapsed + 50,
      `width collapsed=${widthCollapsed} expanded=${widthExpanded}`,
    );

    // Move the mouse far away from the rail (top-right corner) and confirm
    // it collapses back down.
    await page.mouse.move(1200, 850);
    await page.waitForTimeout(400);
    const widthAfterLeave = (await railElement.boundingBox())?.width ?? 0;
    report(
      "hoverSidebar: moving the mouse away collapses the rail back",
      widthAfterLeave < widthExpanded - 50 && Math.abs(widthAfterLeave - widthCollapsed) < 5,
      `width after mouse leaves=${widthAfterLeave} (originally collapsed=${widthCollapsed})`,
    );
  } finally {
    await teardown();
  }
  summarize();
}

main();
