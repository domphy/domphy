// Real-browser interaction check for cardHoverEffect — hovers one card in
// the grid and asserts the shared highlight panel becomes visible and
// positioned behind THAT card specifically, then glides to a different card
// on hover instead of just toggling a static state.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "cardHoverEffect");
    const rootLocator = await locate(page, "cardHoverEffect");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const highlight = componentRoot.locator("> div").first();
    const cards = componentRoot.locator("> a");

    const cardCount = await cards.count();
    if (cardCount < 2) {
      report("cardHoverEffect card count", false, `expected >=2 cards, found ${cardCount}`);
    } else {
      // Before any hover: highlight should be invisible.
      const initialOpacity = await highlight.evaluate((el) => (el as HTMLElement).style.opacity);
      report(
        "cardHoverEffect highlight starts hidden",
        initialOpacity === "0" || initialOpacity === "",
        `opacity=${initialOpacity}`,
      );

      // Hover the first card — highlight should become visible and sit on top
      // of that card's own rect.
      await cards.nth(0).hover();
      await page.waitForTimeout(300);
      const opacityOnCard0 = await highlight.evaluate((el) => (el as HTMLElement).style.opacity);
      const highlightBoxOnCard0 = await highlight.boundingBox();
      const card0Box = await cards.nth(0).boundingBox();
      const card1Box = await cards.nth(1).boundingBox();

      const overlapsCard0 =
        highlightBoxOnCard0 &&
        card0Box &&
        Math.abs(highlightBoxOnCard0.x - card0Box.x) < 20 &&
        Math.abs(highlightBoxOnCard0.y - card0Box.y) < 20;

      report(
        "cardHoverEffect highlight appears behind hovered card",
        opacityOnCard0 === "1" && !!overlapsCard0,
        `opacity=${opacityOnCard0} highlight=${JSON.stringify(highlightBoxOnCard0)} card0=${JSON.stringify(card0Box)}`,
      );

      // Move to the second card — highlight should glide to the new slot (its
      // position should now track card 1, not card 0).
      await cards.nth(1).hover();
      await page.waitForTimeout(300);
      const highlightBoxOnCard1 = await highlight.boundingBox();
      const overlapsCard1 =
        highlightBoxOnCard1 &&
        card1Box &&
        Math.abs(highlightBoxOnCard1.x - card1Box.x) < 20 &&
        Math.abs(highlightBoxOnCard1.y - card1Box.y) < 20;
      const movedFromCard0 =
        highlightBoxOnCard1 && highlightBoxOnCard0 && Math.abs(highlightBoxOnCard1.x - highlightBoxOnCard0.x) > 5;

      report(
        "cardHoverEffect highlight moves to newly hovered card",
        !!overlapsCard1 && !!movedFromCard0,
        `highlightOnCard1=${JSON.stringify(highlightBoxOnCard1)} card1=${JSON.stringify(card1Box)}`,
      );

      // Leave the whole group — highlight should fade back out.
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
      const opacityAfterLeave = await highlight.evaluate((el) => (el as HTMLElement).style.opacity);
      report("cardHoverEffect highlight hides on group mouseleave", opacityAfterLeave === "0", `opacity=${opacityAfterLeave}`);
    }

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
