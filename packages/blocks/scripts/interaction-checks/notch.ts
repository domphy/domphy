// Real-browser interaction check for notch: it has no scroll-reactive
// behavior at all (no window scroll listener in the source) — its defining
// hazard is `position: fixed`, which historically escaped to the real
// browser viewport instead of staying inside its demo card (see demo.html's
// `contain: layout` comment on `.block-box`, added specifically for this).
// So instead of a scroll test, this verifies real click interactions
// (open/select/close a group) plus the position-containment regression.
import { boot, teardown, mountedPage, locate, report, summarize } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "notch");
  await locate(page, "notch");

  const rects = await page.evaluate(() => {
    const nav = document.querySelector('[data-block="notch"] nav[aria-label="Quick settings"]') as HTMLElement | null;
    const box = document.querySelector('[data-block="notch"] .block-box') as HTMLElement | null;
    if (!nav || !box) return null;
    return { nav: nav.getBoundingClientRect().toJSON(), box: box.getBoundingClientRect().toJSON() };
  });

  const containedInCard =
    !!rects &&
    rects.nav.top >= rects.box.top - 1 &&
    rects.nav.bottom <= rects.box.bottom + 1 &&
    rects.nav.left >= rects.box.left - 1 &&
    rects.nav.right <= rects.box.right + 1;

  report(
    "notch:position-fixed-contained-in-own-card",
    containedInCard,
    `expected the position:fixed nav's rect to sit fully inside its own .block-box card (contain:layout containing block), not escape to the real viewport; nav=${JSON.stringify(rects?.nav)} box=${JSON.stringify(rects?.box)}`,
  );

  // Real click interaction: open the "Display" group trigger, assert its
  // panel becomes visible (aria-expanded flips + opacity/visibility toggle).
  const displayTrigger = page.locator('[data-block="notch"] button[aria-label="Display"]');
  await displayTrigger.click();
  await page.waitForTimeout(250);
  const afterOpenState = await page.evaluate(() => {
    const trigger = document.querySelector('[data-block="notch"] button[aria-label="Display"]');
    const panel = document.querySelector('[data-block="notch"] ul[aria-label="Display options"]') as HTMLElement | null;
    return {
      expanded: trigger?.getAttribute("aria-expanded"),
      panelOpacity: panel ? getComputedStyle(panel.parentElement as HTMLElement).opacity : null,
    };
  });
  report(
    "notch:click-trigger-opens-panel",
    afterOpenState.expanded === "true" && afterOpenState.panelOpacity === "1",
    `expected aria-expanded=true + panel opacity 1 after clicking the Display trigger, got ${JSON.stringify(afterOpenState)}`,
  );

  // Real click on an option: selects it, moves the highlight, and (default
  // closeOnSelect=true) closes the panel again.
  const darkOption = page.locator('[data-block="notch"] ul[aria-label="Display options"] button', { hasText: "Dark" });
  await darkOption.click();
  await page.waitForTimeout(250);
  const afterSelectState = await page.evaluate(() => {
    const trigger = document.querySelector('[data-block="notch"] button[aria-label="Display"]');
    return {
      expanded: trigger?.getAttribute("aria-expanded"),
      triggerLabel: trigger?.textContent?.trim(),
    };
  });
  report(
    "notch:select-option-updates-label-and-closes",
    afterSelectState.expanded === "false" && afterSelectState.triggerLabel === "Dark",
    `expected trigger label "Dark" + aria-expanded=false (closeOnSelect) after picking the Dark option, got ${JSON.stringify(afterSelectState)}`,
  );

  await page.close();
  await teardown();
}

main()
  .then(() => summarize())
  .catch((error) => {
    console.error(error);
    report("notch:script-error", false, String(error));
    summarize();
  });
