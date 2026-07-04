// Real browser interaction checks for gooeyInput (src/aceternity/inputs/gooeyInput.ts).
//
// Clicks the icon trigger to expand the field, types real text into it, then
// closes via Escape — asserting the underlying `<input>` actually becomes
// interactive/expands and the value updates, not just that nothing throws.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "gooeyInput");
  await locate(page, "gooeyInput");

  const wrapper = page.locator('[data-block="gooeyInput"]');
  const iconButton = wrapper.locator("button").first();
  const input = wrapper.locator("input").first();
  // The outer wrapper div has a fixed width (the max the field can ever
  // reach); the "chrome" group — the first `aria-hidden` div, holding the
  // icon bubble + pill — is what actually animates its width open/closed.
  const chromeGroup = wrapper.locator('div[aria-hidden="true"]').first();

  const widthBeforeOpen = await chromeGroup.evaluate((el) => (el as HTMLElement).getBoundingClientRect().width);

  await iconButton.click();
  await page.waitForTimeout(500); // TRANSITION_DURATION_MS (380) + settle margin

  const [ariaExpanded, inputOpacity, chromeWidthAfterOpen] = await Promise.all([
    iconButton.getAttribute("aria-expanded"),
    input.evaluate((el) => getComputedStyle(el).opacity),
    chromeGroup.evaluate((el) => (el as HTMLElement).getBoundingClientRect().width),
  ]);

  report(
    "gooeyInput: clicking the icon bubble expands the field",
    ariaExpanded === "true" && inputOpacity === "1" && chromeWidthAfterOpen > widthBeforeOpen,
    `aria-expanded=${ariaExpanded} input opacity=${inputOpacity} width ${widthBeforeOpen}->${chromeWidthAfterOpen}`,
  );

  await input.fill("hello domphy");
  const typedValue = await input.inputValue();
  report(
    "gooeyInput: typing into the expanded input updates its value",
    typedValue === "hello domphy",
    `input.value=${JSON.stringify(typedValue)}`,
  );

  await input.press("Escape");
  await page.waitForTimeout(500);
  const [ariaExpandedAfterEscape, inputOpacityAfterEscape] = await Promise.all([
    iconButton.getAttribute("aria-expanded"),
    input.evaluate((el) => getComputedStyle(el).opacity),
  ]);
  report(
    "gooeyInput: Escape closes the field back down",
    ariaExpandedAfterEscape === "false" && inputOpacityAfterEscape === "0",
    `aria-expanded=${ariaExpandedAfterEscape} input opacity=${inputOpacityAfterEscape}`,
  );

  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
