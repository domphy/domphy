// Real browser check for animatedTestimonials: click next/prev controls and
// assert the displayed quote/name actually changes to a different, known
// testimonial.
//
// All testimonials are always mounted (crossfading stack); the active one is
// identified by its reactive `opacity` (exactly 1 for the active index, 0 for
// every other) — read via getComputedStyle since this is a reactive `style:`
// function (a CSS class rule), not an imperative DOM write.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "animatedTestimonials";

// Copied from this component's own `DEFAULT_TESTIMONIALS` — used only to make
// the assertions meaningful (confirm the active testimonial is the *expected*
// one, not just "some string changed").
const DEFAULT_NAMES = ["Elena Marsh", "Rafael Costa", "Priya Nair"];

async function activeTestimonialName(page: Awaited<ReturnType<typeof mountedPage>>, name: string): Promise<string | null> {
  return page.evaluate((blockName) => {
    const root = document.querySelector(`[data-block="${blockName}"]`);
    // The text-stack wrapper divs are the ones whose *direct* child is an
    // <h3> (the quote) — distinguishes them from the photo-stack divs.
    const candidates = Array.from(root?.querySelectorAll("div") ?? []).filter(
      (div) => div.querySelector(":scope > h3") !== null,
    );
    for (const candidate of candidates) {
      if (getComputedStyle(candidate).opacity === "1") {
        return candidate.querySelector("strong")?.textContent ?? null;
      }
    }
    return null;
  }, name);
}

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);

    const initialName = await activeTestimonialName(page, NAME);
    report(
      `${NAME}: initial active testimonial is the first default author`,
      initialName === DEFAULT_NAMES[0],
      `active author="${initialName}"`,
    );

    await block.locator('[aria-label="Next testimonial"]').click();
    await page.waitForTimeout(500);
    const afterNextName = await activeTestimonialName(page, NAME);
    report(
      `${NAME}: clicking "Next testimonial" advances to the 2nd author`,
      afterNextName === DEFAULT_NAMES[1] && afterNextName !== initialName,
      `active author="${afterNextName}"`,
    );

    await block.locator('[aria-label="Previous testimonial"]').click();
    await block.locator('[aria-label="Previous testimonial"]').click();
    await page.waitForTimeout(500);
    const afterPrevName = await activeTestimonialName(page, NAME);
    report(
      `${NAME}: clicking "Previous testimonial" twice wraps to the last author`,
      afterPrevName === DEFAULT_NAMES[DEFAULT_NAMES.length - 1],
      `active author="${afterPrevName}"`,
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
