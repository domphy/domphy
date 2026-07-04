// Real-browser interaction check for `statefulButton`: click it and assert it
// actually morphs idle -> loading -> success -> back to idle (default demo
// props have no `onClick` and `successHoldDuration` defaults to 2000ms — see
// src/aceternity/buttons/statefulButton.ts).
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "statefulButton");
  const locator = await locate(page, "statefulButton");
  const button = locator.locator("button");

  const idleText = await button.textContent();
  const idleBusy = await button.getAttribute("aria-busy");
  report(
    "statefulButton: idle state shows the label and aria-busy=false",
    idleText === "Send message" && idleBusy === "false",
    `textContent=${JSON.stringify(idleText)} aria-busy=${idleBusy}`,
  );

  // Domphy's state->DOM updates are microtask-deferred (Notifier._scheduleFlush
  // uses queueMicrotask, see packages/core/src/classes/Notifier.ts), so
  // `.click()` followed by exactly ONE microtask turn (`await Promise.resolve()`)
  // lands right after the "loading" render flush but before the click handler's
  // own `await props.onClick?.(event)` (props.onClick is undefined in the
  // default demo) resumes and flips phase to "success" — otherwise the loading
  // phase would never be observed (a Playwright round-trip evaluate() gives
  // every microtask, including the success flip, time to run first).
  const afterOneMicrotask = await locator.evaluate(async (element) => {
    const target = element.querySelector("button")!;
    target.click();
    await Promise.resolve();
    return {
      ariaBusy: target.getAttribute("aria-busy"),
      hasSpinner: !!target.querySelector('[role="status"][aria-label="loading"]'),
    };
  });
  report(
    "statefulButton: click enters the loading state (spinner + aria-busy=true) one microtask later",
    afterOneMicrotask.ariaBusy === "true" && afterOneMicrotask.hasSpinner,
    `ariaBusy=${afterOneMicrotask.ariaBusy} hasSpinner=${afterOneMicrotask.hasSpinner}`,
  );

  // The microtask flipping phase to "success" has now had time to run.
  await page.waitForTimeout(50);
  const successState = await button.evaluate((element) => ({
    ariaBusy: element.getAttribute("aria-busy"),
    hasCheckmark: !!element.querySelector("svg polyline"),
  }));
  report(
    "statefulButton: settles into the success checkmark after the click resolves",
    successState.ariaBusy === "false" && successState.hasCheckmark,
    `ariaBusy=${successState.ariaBusy} hasCheckmark=${successState.hasCheckmark}`,
  );

  // successHoldDuration defaults to 2000ms; wait past it for the auto-revert.
  await page.waitForTimeout(2200);
  const revertedText = await button.textContent();
  report(
    "statefulButton: reverts to the idle label after successHoldDuration (2000ms)",
    revertedText === "Send message",
    `textContent=${JSON.stringify(revertedText)}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
