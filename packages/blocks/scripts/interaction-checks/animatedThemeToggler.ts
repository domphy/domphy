// Real-browser interaction check for animatedThemeToggler — clicks the
// toggle button and asserts the theme actually flips. This component is
// theme-agnostic (it owns no global `data-theme` attribute of its own — see
// its own source comment: it reports the toggled value via `theme`/
// `onThemeChange` and leaves wiring that into e.g. `<html data-theme>` to the
// caller, which this zero-args demo instance doesn't do), so the real,
// observable signal of an actual toggle for *this* instance is its own
// sun/moon icon swap, driven by `display: theme.get() === visibleWhen ?
// "flex" : "none"` — which is exactly what flips when `handleToggle()` calls
// `theme.set(nextTheme)`.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "animatedThemeToggler");
    const rootLocator = await locate(page, "animatedThemeToggler");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    // Source order: [lightIcon span, darkIcon span].
    const lightIconSpan = componentRoot.locator("span").nth(0);
    const darkIconSpan = componentRoot.locator("span").nth(1);

    const readState = async () => ({
      light: await lightIconSpan.evaluate((el) => getComputedStyle(el).display),
      dark: await darkIconSpan.evaluate((el) => getComputedStyle(el).display),
    });

    const before = await readState();
    await componentRoot.click();
    // Allow the (possibly View-Transition-gated) `theme.set()` callback and
    // any microtask/animation-frame settling to run.
    await page.waitForTimeout(300);
    const after = await readState();

    report(
      "animatedThemeToggler starts on the light icon",
      before.light === "flex" && before.dark === "none",
      `before=${JSON.stringify(before)}`,
    );
    report(
      "animatedThemeToggler swaps to the dark icon after a click (theme actually toggled)",
      after.light === "none" && after.dark === "flex",
      `after=${JSON.stringify(after)}`,
    );

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
