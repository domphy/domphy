// Real browser interaction checks for keyboard (src/aceternity/cards/keyboard.ts).
//
// Scrolls the board into view (arms its IntersectionObserver-gated document
// keydown/keyup listeners), then drives a real physical keypress via
// Playwright's Keyboard API and asserts the matching on-screen `<kbd>` key
// actually lights up (background/shadow/transform change) while held and
// releases afterward, plus the floating keystroke preview updates.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "keyboard");
  await locate(page, "keyboard");

  const wrapper = page.locator('[data-block="keyboard"]');
  // The board tray itself carries `data-tone="shift-1"`; the floating
  // keystroke-preview `<kbd>` sits outside it, so scoping the lookup to the
  // tray avoids matching the preview once it also starts showing "a".
  const keyA = wrapper.locator('[data-tone="shift-1"] kbd', { hasText: /^a$/i }).first();
  const previewKey = wrapper.locator("kbd").first();

  const styleAtRest = await keyA.evaluate((el) => {
    const style = getComputedStyle(el);
    return { backgroundColor: style.backgroundColor, transform: style.transform };
  });

  await page.keyboard.down("a");
  await page.waitForTimeout(150); // let the reactive style/preview re-render settle

  const [styleWhilePressed, previewText] = await Promise.all([
    keyA.evaluate((el) => {
      const style = getComputedStyle(el);
      return { backgroundColor: style.backgroundColor, transform: style.transform };
    }),
    previewKey.textContent(),
  ]);

  await page.keyboard.up("a");
  await page.waitForTimeout(150);

  const styleAfterRelease = await keyA.evaluate((el) => {
    const style = getComputedStyle(el);
    return { backgroundColor: style.backgroundColor, transform: style.transform };
  });

  const visuallyChangedOnPress =
    styleWhilePressed.backgroundColor !== styleAtRest.backgroundColor ||
    styleWhilePressed.transform !== styleAtRest.transform;
  report(
    "keyboard: pressing 'A' visually presses its on-screen key",
    visuallyChangedOnPress,
    `at rest=${JSON.stringify(styleAtRest)} while pressed=${JSON.stringify(styleWhilePressed)}`,
  );

  const revertedOnRelease =
    styleAfterRelease.backgroundColor === styleAtRest.backgroundColor &&
    styleAfterRelease.transform === styleAtRest.transform;
  report(
    "keyboard: releasing the key restores the resting visual state",
    revertedOnRelease,
    `at rest=${JSON.stringify(styleAtRest)} after release=${JSON.stringify(styleAfterRelease)}`,
  );

  report(
    "keyboard: floating keystroke preview shows the typed character",
    !!previewText && previewText.toLowerCase() === "a",
    `preview text=${JSON.stringify(previewText)}`,
  );

  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
