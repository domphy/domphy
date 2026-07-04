// Real browser check for multiStepLoader: click the "Click to load" trigger
// button and assert the overlay actually appears and progresses through
// steps over time (the displayed/bold step advances after one `duration`
// interval), then close it via the built-in close button.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "multiStepLoader";

// Copied from this component's own `DEFAULT_STEPS` — used only to make the
// assertions meaningful.
const DEFAULT_STEP_TEXT = ["Buying a condo", "Travelling in a flight", "Meeting Tyler Durden"];

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);
    const overlay = block.locator('[role="status"][aria-label="Loading"]');

    const visibilityBeforeClick = await overlay.evaluate((el) => getComputedStyle(el).visibility);
    report(
      `${NAME}: overlay starts hidden before the trigger is clicked`,
      visibilityBeforeClick === "hidden",
      `visibility before click="${visibilityBeforeClick}"`,
    );

    await block.locator("button", { hasText: "Click to load" }).click();
    await page.waitForTimeout(200);

    const visibilityAfterClick = await overlay.evaluate((el) => getComputedStyle(el).visibility);
    const opacityAfterClick = await overlay.evaluate((el) => getComputedStyle(el).opacity);
    report(
      `${NAME}: clicking the trigger actually shows the loading overlay`,
      visibilityAfterClick === "visible" && Number.parseFloat(opacityAfterClick) > 0.9,
      `visibility="${visibilityAfterClick}", opacity="${opacityAfterClick}"`,
    );

    const initialStepText = await overlay.locator("strong").first().textContent();
    report(
      `${NAME}: the first step is bold/current immediately after opening`,
      initialStepText === DEFAULT_STEP_TEXT[0],
      `current step="${initialStepText}"`,
    );

    // Default `duration` is 2000ms between auto-advances — wait past one
    // full interval and confirm the loader actually progressed on its own.
    await page.waitForTimeout(2400);
    const stepTextAfterOneInterval = await overlay.locator("strong").first().textContent();
    report(
      `${NAME}: the loader auto-progresses to the 2nd step after one duration interval`,
      stepTextAfterOneInterval === DEFAULT_STEP_TEXT[1] && stepTextAfterOneInterval !== initialStepText,
      `current step after ~2.4s="${stepTextAfterOneInterval}"`,
    );

    await page.waitForTimeout(2000);
    const stepTextAfterTwoIntervals = await overlay.locator("strong").first().textContent();
    report(
      `${NAME}: the loader keeps progressing to the 3rd step over time`,
      stepTextAfterTwoIntervals === DEFAULT_STEP_TEXT[2],
      `current step after ~4.4s="${stepTextAfterTwoIntervals}"`,
    );

    await overlay.locator('[aria-label="Close"]').click();
    await page.waitForTimeout(400);
    const visibilityAfterClose = await overlay.evaluate((el) => getComputedStyle(el).visibility);
    report(
      `${NAME}: the close button actually dismisses the overlay`,
      visibilityAfterClose === "hidden",
      `visibility after close="${visibilityAfterClose}"`,
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
