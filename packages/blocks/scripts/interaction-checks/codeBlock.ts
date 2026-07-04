// REAL browser interaction check for codeBlock — clicks the second tab
// button and asserts the highlighted code content actually switches to a
// DIFFERENT snippet (per src/aceternity/layout/codeBlock.ts's
// `switchTab`/`activeTabIndex` state), and that the clicked tab visually
// becomes the active one.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "codeBlock");
  const wrapper = await locate(page, "codeBlock");
  const root = wrapper.locator(".block-box > *").first();
  const codeBody = root.locator("pre code");
  const firstTabButton = root.locator("button", { hasText: "greet.ts" });
  const secondTabButton = root.locator("button", { hasText: "index.ts" });

  const codeBefore = await codeBody.evaluate((element) => element.textContent);
  const secondTabOpacityBefore = await secondTabButton.evaluate((element) => getComputedStyle(element).opacity);

  await secondTabButton.click();
  // The body cross-fades via a double-rAF-scheduled opacity toggle plus a
  // 150ms CSS transition (see `afterTwoFrames`/`bodyOpacity`) — wait past that.
  await page.waitForTimeout(400);

  const codeAfter = await codeBody.evaluate((element) => element.textContent);
  const secondTabOpacityAfter = await secondTabButton.evaluate((element) => getComputedStyle(element).opacity);
  const firstTabOpacityAfter = await firstTabButton.evaluate((element) => getComputedStyle(element).opacity);

  report(
    "codeBlock: clicking a different tab switches the highlighted code to a DIFFERENT snippet",
    typeof codeBefore === "string" &&
      typeof codeAfter === "string" &&
      codeAfter !== codeBefore &&
      codeAfter.includes('greet("Domphy")') &&
      codeBefore.includes("export function greet"),
    `before=${JSON.stringify(codeBefore?.slice(0, 40))} after=${JSON.stringify(codeAfter?.slice(0, 40))}`,
  );

  report(
    "codeBlock: the clicked tab becomes visually active (full opacity) and the other dims",
    Number(secondTabOpacityBefore) < 1 && Number(secondTabOpacityAfter) === 1 && Number(firstTabOpacityAfter) < 1,
    `secondTab opacity before=${secondTabOpacityBefore} after=${secondTabOpacityAfter}; firstTab opacity after=${firstTabOpacityAfter}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
