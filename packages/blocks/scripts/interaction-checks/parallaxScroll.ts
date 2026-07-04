// Real browser check for parallaxScroll: scroll the page in small real
// steps and assert the columns actually move at DIFFERENT (opposite) rates
// relative to each other — proving true parallax, not everything moving
// together. Columns alternate `direction` (-1/+1) by index, so any nonzero
// scroll progress must produce opposite-signed `translateY` offsets.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "parallaxScroll";

function parseTranslateY(transform: string): number | null {
  const match = transform.match(/translateY\((-?[\d.]+)px\)/);
  return match ? Number.parseFloat(match[1]!) : null;
}

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);
    const columnOne = block.locator("section > div > div").nth(0);
    const columnTwo = block.locator("section > div > div").nth(1);

    const beforeOneTransform = await columnOne.evaluate((el) => (el as HTMLElement).style.transform);
    const beforeTwoTransform = await columnTwo.evaluate((el) => (el as HTMLElement).style.transform);

    // A handful of small, real scroll steps (page.mouse.wheel dispatches real
    // "wheel" events, which the component listens to via `window`'s "scroll").
    for (let step = 0; step < 6; step++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(500);

    const afterOneTransform = await columnOne.evaluate((el) => (el as HTMLElement).style.transform);
    const afterTwoTransform = await columnTwo.evaluate((el) => (el as HTMLElement).style.transform);
    const afterOneY = parseTranslateY(afterOneTransform);
    const afterTwoY = parseTranslateY(afterTwoTransform);

    report(
      `${NAME}: scrolling actually moves the columns (real translateY offset)`,
      afterOneTransform !== beforeOneTransform || afterTwoTransform !== beforeTwoTransform,
      `column0 "${beforeOneTransform}" -> "${afterOneTransform}", column1 "${beforeTwoTransform}" -> "${afterTwoTransform}"`,
    );

    report(
      `${NAME}: column0 and column1 move at different (opposite-signed) rates — real per-column parallax`,
      afterOneY !== null && afterTwoY !== null && Math.sign(afterOneY) !== Math.sign(afterTwoY) && afterOneY !== afterTwoY,
      `column0 translateY=${afterOneY}, column1 translateY=${afterTwoY}`,
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
