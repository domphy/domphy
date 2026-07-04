// Real browser check for layoutMotionCards: hover over the card group and
// assert the hovered card's transform actually expands to the enlarged,
// centered state while a different (non-hovered) card gets a DIFFERENT,
// dimmed transform — per-card, not a single group-wide effect.
//
// `applyActiveState` writes `left`/`top`/`transform`/`opacity` imperatively
// via plain DOM writes (not a reactive `style:` function), so these are real
// inline-style reads, applied synchronously on hover (no animation wait
// needed for the *value*, though a short settle is still given for realism).
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "layoutMotionCards";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);
    const cards = block.locator('[role="button"][tabindex="0"]');

    const firstCardRestTransform = await cards.nth(0).evaluate((el) => (el as HTMLElement).style.transform);
    const secondCardRestTransform = await cards.nth(1).evaluate((el) => (el as HTMLElement).style.transform);

    await cards.nth(0).hover();
    await page.waitForTimeout(500);

    const firstCardHoverTransform = await cards.nth(0).evaluate((el) => (el as HTMLElement).style.transform);
    const secondCardHoverTransform = await cards.nth(1).evaluate((el) => (el as HTMLElement).style.transform);

    report(
      `${NAME}: hovering a card expands it (transform changes from resting state)`,
      firstCardHoverTransform !== firstCardRestTransform && firstCardHoverTransform.includes("1.8"),
      `card0 resting="${firstCardRestTransform}", hovered="${firstCardHoverTransform}"`,
    );

    report(
      `${NAME}: the non-hovered neighbor gets a DIFFERENT (dimmed) transform, not the same expansion`,
      secondCardHoverTransform !== secondCardRestTransform && secondCardHoverTransform !== firstCardHoverTransform,
      `card1 resting="${secondCardRestTransform}", while card0 hovered="${secondCardHoverTransform}"`,
    );

    const blockBox = await block.boundingBox();
    if (!blockBox) throw new Error(`${NAME}: block has no bounding box`);
    await page.mouse.move(blockBox.x + blockBox.width / 2, blockBox.y - 60);
    await page.waitForTimeout(500);
    const firstCardAfterLeaveTransform = await cards.nth(0).evaluate((el) => (el as HTMLElement).style.transform);
    report(
      `${NAME}: moving the mouse away reverts the card back to its resting transform`,
      firstCardAfterLeaveTransform === firstCardRestTransform,
      `card0 after mouseleave="${firstCardAfterLeaveTransform}" (expected resting "${firstCardRestTransform}")`,
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
