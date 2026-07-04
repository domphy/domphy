// Real browser check for fanCards: hover the card group and assert the deck
// actually fans open — different cards get different transforms (rotation/
// translate that varies by each card's offset from center), not one shared
// transform.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "fanCards";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);
    // The 4 preview cards all share `dataTone: "shift-16"` — unique within
    // this component (the headline doesn't use that tone).
    const cards = block.locator('[data-tone="shift-16"]');

    const restTransforms = await cards.evaluateAll((elements) => elements.map((el) => (el as HTMLElement).style.transform));

    await block.hover();
    await page.waitForTimeout(600);

    const fannedTransforms = await cards.evaluateAll((elements) => elements.map((el) => (el as HTMLElement).style.transform));

    const allChanged = fannedTransforms.every((value, index) => value !== restTransforms[index]);
    report(
      `${NAME}: hovering fans open every card (each transform changes from resting)`,
      allChanged,
      `resting=${JSON.stringify(restTransforms)}, fanned=${JSON.stringify(fannedTransforms)}`,
    );

    const distinctFannedValues = new Set(fannedTransforms);
    report(
      `${NAME}: fanned cards get DIFFERENT per-card transforms (real fan spread, not one shared transform)`,
      distinctFannedValues.size === fannedTransforms.length,
      `fanned transforms=${JSON.stringify(fannedTransforms)}`,
    );

    const blockBox = await block.boundingBox();
    if (!blockBox) throw new Error(`${NAME}: block has no bounding box`);
    await page.mouse.move(blockBox.x + blockBox.width / 2, blockBox.y - 80);
    await page.waitForTimeout(600);
    const restedTransforms = await cards.evaluateAll((elements) => elements.map((el) => (el as HTMLElement).style.transform));
    report(
      `${NAME}: moving the mouse away closes the fan back to resting transforms`,
      JSON.stringify(restedTransforms) === JSON.stringify(restTransforms),
      `resting after leave=${JSON.stringify(restedTransforms)}`,
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
