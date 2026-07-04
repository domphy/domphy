// Real browser check for carousel: click next/prev controls and assert the
// displayed slide's content actually changes to a different, known slide.
//
// All 4 slides are always mounted (absolutely stacked); the "front" one is
// identified by its reactive `z-index` (computeZIndex = totalSlides - distance,
// so the active slide is uniquely the max) — read via getComputedStyle since
// this is a reactive `style:` function (compiled to a CSS class rule, not an
// inline attribute), not an imperative DOM write.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "carousel";

// Copied from this component's own `DEFAULT_SLIDES` — used only to make the
// assertions meaningful (confirm the front slide is the *expected* one, not
// just "some string changed").
const DEFAULT_TITLES = [
  "Northern Lights Expedition",
  "Kyoto in Autumn",
  "Sahara Dune Crossing",
  "Fjords of Norway",
];

async function frontSlideTitle(page: Awaited<ReturnType<typeof mountedPage>>, name: string): Promise<string | null> {
  return page.evaluate((blockName) => {
    const root = document.querySelector(`[data-block="${blockName}"]`);
    const slides = Array.from(root?.querySelectorAll('[role="group"][aria-roledescription="slide"]') ?? []);
    let best: Element | null = null;
    let bestZ = Number.NEGATIVE_INFINITY;
    for (const slide of slides) {
      const z = Number(getComputedStyle(slide).zIndex) || 0;
      if (z > bestZ) {
        bestZ = z;
        best = slide;
      }
    }
    return best?.querySelector("h3")?.textContent ?? null;
  }, name);
}

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);

    const initialTitle = await frontSlideTitle(page, NAME);
    report(
      `${NAME}: initial front slide is the first default slide`,
      initialTitle === DEFAULT_TITLES[0],
      `front slide title="${initialTitle}"`,
    );

    await block.locator('[aria-label="Next slide"]').click();
    await page.waitForTimeout(500);
    const afterNextTitle = await frontSlideTitle(page, NAME);
    report(
      `${NAME}: clicking "Next slide" advances to the 2nd slide's content`,
      afterNextTitle === DEFAULT_TITLES[1] && afterNextTitle !== initialTitle,
      `front slide title="${afterNextTitle}"`,
    );

    await block.locator('[aria-label="Previous slide"]').click();
    await block.locator('[aria-label="Previous slide"]').click();
    await page.waitForTimeout(500);
    const afterPrevTitle = await frontSlideTitle(page, NAME);
    report(
      `${NAME}: clicking "Previous slide" twice wraps to the last slide`,
      afterPrevTitle === DEFAULT_TITLES[DEFAULT_TITLES.length - 1],
      `front slide title="${afterPrevTitle}"`,
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
