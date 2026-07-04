// Real-browser interaction check for expandableCard — clicks a collapsed
// card and asserts the native <dialog> actually opens (larger bounding box
// than the source card), then closes it with Escape and asserts it actually
// closes.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "expandableCard");
    const rootLocator = await locate(page, "expandableCard");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const collapsedWrap = componentRoot.locator("> div").first();
    const buttons = collapsedWrap.locator("> button");
    const dialogLocator = componentRoot.locator("> dialog");

    const buttonCount = await buttons.count();
    if (buttonCount < 1) {
      report("expandableCard button count", false, `expected >=1 collapsed card, found ${buttonCount}`);
    } else {
      const sourceBox = await buttons.nth(0).boundingBox();
      const isOpenBefore = await dialogLocator.evaluate((el) => (el as HTMLDialogElement).open);
      report("expandableCard dialog starts closed", isOpenBefore === false, `open=${isOpenBefore}`);

      await buttons.nth(0).click();
      // Wait for showModal() + the morph tween (320ms) to settle.
      await page.waitForTimeout(500);

      const isOpenAfterClick = await dialogLocator.evaluate((el) => (el as HTMLDialogElement).open);
      const expandedBox = await dialogLocator.boundingBox();
      const grewLargerThanSource =
        !!expandedBox && !!sourceBox && expandedBox.width * expandedBox.height > sourceBox.width * sourceBox.height * 2;

      report(
        "expandableCard opens into a larger panel on click",
        isOpenAfterClick === true && grewLargerThanSource,
        `open=${isOpenAfterClick} source=${JSON.stringify(sourceBox)} expanded=${JSON.stringify(expandedBox)}`,
      );

      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      const isOpenAfterEscape = await dialogLocator.evaluate((el) => (el as HTMLDialogElement).open);
      report("expandableCard closes on Escape", isOpenAfterEscape === false, `open=${isOpenAfterEscape}`);
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
