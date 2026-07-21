// Real-browser interaction check for coolMode — presses down on the wrapped
// trigger button and asserts particle sprites actually get spawned into the
// shared, `document.body`-level overlay (not nested inside the component
// itself, per its own spec), then confirms holding the button keeps
// trickling out more particles over time (not just a single one-shot spawn).
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
  try {
    const page = await mountedPage(demoUrl, "coolMode");
    const rootLocator = await locate(page, "coolMode");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const triggerButton = componentRoot.locator("button").first();

    const countOverlayParticles = () =>
      page.evaluate(() => {
        const overlay = Array.from(document.body.children).find(
          (el) =>
            el.tagName === "DIV" &&
            el.getAttribute("aria-hidden") === "true" &&
            getComputedStyle(el as HTMLElement).position === "fixed",
        );
        return overlay ? overlay.children.length : 0;
      });

    const beforeCount = await countOverlayParticles();

    const buttonBox = await triggerButton.boundingBox();
    if (!buttonBox) {
      report(
        "coolMode trigger bounds",
        false,
        "trigger button has no bounding box",
      );
    } else {
      await page.mouse.move(
        buttonBox.x + buttonBox.width / 2,
        buttonBox.y + buttonBox.height / 2,
      );
      await page.mouse.down();
      await page.waitForTimeout(60);
      const afterDownCount = await countOverlayParticles();

      report(
        "coolMode spawns particles into the shared overlay on pointerdown",
        beforeCount === 0 && afterDownCount > 0,
        `before=${beforeCount} afterDown=${afterDownCount}`,
      );

      // Holding continues to trickle out more particles every ~30ms.
      await page.waitForTimeout(150);
      const afterHoldCount = await countOverlayParticles();
      report(
        "coolMode keeps spawning particles while held (trickle, not a one-shot burst)",
        afterHoldCount > afterDownCount,
        `afterDown=${afterDownCount} afterHold=${afterHoldCount}`,
      );

      await page.mouse.up();
    }

    await page.close();
  } finally {
    await teardown();
  }
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
