// Real-browser interaction check for `interactiveHoverButton`: hover over it
// and assert the accent dot's scale and the hover-overlay's opacity actually
// change via the button's own `&:hover [data-*]` CSS rules — see
// src/magicui/community/interactiveHoverButton.ts.
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
  const page = await mountedPage(demoUrl, "interactiveHoverButton");
  const locator = await locate(page, "interactiveHoverButton");
  const button = locator.locator("button");

  const baseline = await page.evaluate(() => {
    const dotElement = document.querySelector("[data-ihb-dot]") as HTMLElement;
    const overlayElement = document.querySelector(
      "[data-ihb-overlay]",
    ) as HTMLElement;
    return {
      dotTransform: getComputedStyle(dotElement).transform,
      overlayOpacity: getComputedStyle(overlayElement).opacity,
    };
  });
  report(
    "interactiveHoverButton: at rest the dot is unscaled and the overlay is invisible",
    baseline.overlayOpacity === "0" && baseline.dotTransform !== "none",
    `dotTransform=${baseline.dotTransform} overlayOpacity=${baseline.overlayOpacity}`,
  );

  await button.hover();
  // transform/opacity both transition over 320ms — wait past it for a settled read.
  await page.waitForTimeout(420);
  const hovered = await page.evaluate(() => {
    const dotElement = document.querySelector("[data-ihb-dot]") as HTMLElement;
    const overlayElement = document.querySelector(
      "[data-ihb-overlay]",
    ) as HTMLElement;
    return {
      dotTransform: getComputedStyle(dotElement).transform,
      overlayOpacity: getComputedStyle(overlayElement).opacity,
    };
  });
  report(
    "interactiveHoverButton: hovering floods the dot (scale(90)) and reveals the overlay",
    hovered.dotTransform !== baseline.dotTransform &&
      hovered.overlayOpacity === "1",
    `dotTransform=${hovered.dotTransform} overlayOpacity=${hovered.overlayOpacity}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
