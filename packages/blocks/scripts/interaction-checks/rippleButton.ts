// Real-browser interaction check for `rippleButton`: click it and assert a
// ripple <span> is actually created in the DOM at the click point, then
// removed again after its own `duration` (default 600ms) — see
// src/magicui/buttons/rippleButton.ts.
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
  const page = await mountedPage(demoUrl, "rippleButton");
  const locator = await locate(page, "rippleButton");
  const button = locator.locator("button");

  const rippleCountBefore = await button.evaluate(
    (element) =>
      element.querySelectorAll(
        'span[aria-hidden="true"] > span[style*="position: absolute"]',
      ).length,
  );
  report(
    "rippleButton: no ripple present before any click",
    rippleCountBefore === 0,
    `rippleCountBefore=${rippleCountBefore}`,
  );

  // `ripples.set(...)` runs synchronously in the click handler itself (no
  // await in between), so the ripple <span> shows up immediately — no
  // microtask-timing trick needed here (unlike statefulButton's async phases).
  await button.click();
  const afterClick = await button.evaluate((element) => {
    // Style props on `rippleCircle` are plain per-instance strings (not
    // reactive functions), so Domphy compiles them into a generated CSS
    // class rather than an inline `style` attribute — read back via
    // `getComputedStyle`, not `.style.left`.
    const ripple = element.querySelector(
      'span[aria-hidden="true"] > span',
    ) as HTMLElement | null;
    const computed = ripple ? getComputedStyle(ripple) : null;
    return {
      count: element.querySelectorAll('span[aria-hidden="true"] > span').length,
      position: computed?.position ?? null,
      left: computed?.left ?? null,
      top: computed?.top ?? null,
    };
  });
  report(
    "rippleButton: click spawns a ripple <span> positioned at the click point",
    afterClick.count === 1 &&
      afterClick.position === "absolute" &&
      /^\d+px$/.test(afterClick.left ?? "") &&
      /^\d+px$/.test(afterClick.top ?? ""),
    `count=${afterClick.count} position=${afterClick.position} left=${afterClick.left} top=${afterClick.top}`,
  );

  // duration defaults to 600ms; the ripple's own cleanup timer removes it
  // from the reactive array shortly after.
  await page.waitForTimeout(800);
  const afterFade = await button.evaluate(
    (element) =>
      element.querySelectorAll('span[aria-hidden="true"] > span').length,
  );
  report(
    "rippleButton: ripple is removed from the DOM after its 600ms duration",
    afterFade === 0,
    `rippleCountAfterFade=${afterFade}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
