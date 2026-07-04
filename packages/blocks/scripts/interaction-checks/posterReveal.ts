// Real browser check for posterReveal: click the replay control and assert
// the reveal animation actually restarts.
//
// Replay works by bumping a version counter folded into every layer's `_key`
// (see the file's own header comment) — bumping it remounts the ENTIRE
// poster subtree as brand-new DOM nodes. So the strongest, most direct proof
// of "replay actually restarted" is DOM node identity: tag the wordmark
// element before clicking replay, then confirm the element found at the same
// query afterward is a genuinely different node (tag gone) — not just "some
// style changed". A second check confirms the freshly-remounted wordmark
// actually finishes its reveal (opacity settles back to 1).
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "posterReveal";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);

    // Let the initial cascade + camera zoom settle first.
    await page.waitForTimeout(3200);

    const wordmark = block.locator('[aria-label="Wordmark"]');
    await wordmark.evaluate((el) => el.setAttribute("data-test-marker", "before-replay"));
    const opacityBeforeReplay = await wordmark.evaluate((el) => getComputedStyle(el).opacity);

    const replayButton = block.locator('[aria-label="Replay poster reveal"]');
    await replayButton.click();
    await page.waitForTimeout(50);

    const markerAfterReplay = await block
      .locator('[aria-label="Wordmark"]')
      .evaluate((el) => el.getAttribute("data-test-marker"));
    report(
      `${NAME}: replay button remounts the poster (fresh DOM nodes, not just a style tweak)`,
      markerAfterReplay === null,
      `data-test-marker after replay="${markerAfterReplay}" (expected null — a brand-new element)`,
    );

    const opacityRightAfterReplay = await block.locator('[aria-label="Wordmark"]').evaluate((el) => getComputedStyle(el).opacity);
    report(
      `${NAME}: the freshly-remounted wordmark starts the reveal over (opacity resets low)`,
      Number.parseFloat(opacityRightAfterReplay) < Number.parseFloat(opacityBeforeReplay),
      `opacity before replay=${opacityBeforeReplay}, right after replay click=${opacityRightAfterReplay}`,
    );

    await page.waitForTimeout(3200);
    const opacitySettled = await block.locator('[aria-label="Wordmark"]').evaluate((el) => getComputedStyle(el).opacity);
    report(
      `${NAME}: the replayed reveal actually completes (wordmark opacity settles back to 1)`,
      Number.parseFloat(opacitySettled) > 0.95,
      `opacity after settling=${opacitySettled}`,
    );

    await page.close();
  } finally {
    await teardown();
  }
}

main()
  .catch((error) => {
    console.error(error);
    report(`${NAME}: unexpected error`, false, String(error));
  })
  .finally(() => summarize());
