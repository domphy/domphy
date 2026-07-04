// Real-browser interaction check for focusCards — hovers one card and
// asserts it stays sharp/scaled-up while every OTHER card in the row gets a
// blur/dim filter, then clears when the pointer leaves the group.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "focusCards");
    const rootLocator = await locate(page, "focusCards");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const cards = componentRoot.locator("> div");

    const cardCount = await cards.count();
    if (cardCount < 3) {
      report("focusCards card count", false, `expected >=3 cards, found ${cardCount}`);
    } else {
      const readFilterAndTransform = (index: number) =>
        cards.nth(index).evaluate((el) => ({
          filter: (el as HTMLElement).style.filter,
          transform: (el as HTMLElement).style.transform,
        }));

      const before = await readFilterAndTransform(1);
      report(
        "focusCards starts with no dim/blur applied",
        before.filter === "blur(0px) brightness(1)" || before.filter === "",
        `card1 before=${JSON.stringify(before)}`,
      );

      await cards.nth(1).hover();
      await page.waitForTimeout(300);

      const hovered = await readFilterAndTransform(1);
      const sibling0 = await readFilterAndTransform(0);
      const sibling2 = await readFilterAndTransform(2);

      const hoveredIsSharp = hovered.filter.includes("blur(0px)") && hovered.transform.includes("scale(1.04)");
      const siblingsAreDimmed =
        sibling0.filter.includes("blur(4px)") &&
        sibling0.filter.includes("brightness(0.6)") &&
        sibling2.filter.includes("blur(4px)") &&
        sibling2.filter.includes("brightness(0.6)");

      report("focusCards hovered card stays sharp", hoveredIsSharp, `hovered card1=${JSON.stringify(hovered)}`);
      report(
        "focusCards sibling cards blur/dim while another is hovered",
        siblingsAreDimmed,
        `sibling0=${JSON.stringify(sibling0)} sibling2=${JSON.stringify(sibling2)}`,
      );

      // Leave the row entirely — all cards should return to the resting state.
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
      const afterLeave1 = await readFilterAndTransform(1);
      const afterLeave0 = await readFilterAndTransform(0);
      report(
        "focusCards clears focus state on group mouseleave",
        afterLeave1.filter.includes("blur(0px)") && afterLeave0.filter.includes("blur(0px)"),
        `after leave: card0=${JSON.stringify(afterLeave0)} card1=${JSON.stringify(afterLeave1)}`,
      );
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
