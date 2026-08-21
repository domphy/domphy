// REAL browser interaction check for hyperText — hovers to trigger the
// scramble (default `hoverTrigger: true`), samples mid-animation to confirm
// the text actually scrambles (not a no-op), then waits past the component's
// own `duration` (default 800ms) and asserts the FINAL settled text matches
// the intended phrase (see src/magicui/text/hyperText.ts's `play()`).
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

const EXPECTED_TEXT = "HOVER TO DECODE"; // default children, rendered uppercase
const DURATION_MS = 800; // hyperText()'s own default `duration`

// hyperText renders space characters as U+00A0 (non-breaking space) so their
// spans don't collapse away (this package's own hyperText.test.ts documents
// the same idiom) — normalize before comparing against the plain-space
// phrase above.
const normalizeNbsp = (text: string | null) => (text ?? "").replace(/ /g, " ");

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "hyperText");
  const wrapper = await locate(page, "hyperText");
  const root = wrapper.locator(".block-box > *").first();

  // Auto-plays once on mount — wait for that scramble to settle first.
  await page.waitForTimeout(DURATION_MS + 200);
  const textAtRest = normalizeNbsp(
    await root.evaluate((element) => element.textContent),
  );
  report(
    "hyperText: settles on the intended phrase after the mount scramble",
    textAtRest === EXPECTED_TEXT,
    `text at rest = ${JSON.stringify(textAtRest)}`,
  );

  await root.hover();
  // Sample partway through the scramble (well past the first 40ms tick, well
  // before `duration` completes) — the not-yet-locked characters should read
  // as random noise, i.e. different from the resolved phrase.
  await page.waitForTimeout(DURATION_MS * 0.35);
  const textMidScramble = normalizeNbsp(
    await root.evaluate((element) => element.textContent),
  );
  report(
    "hyperText: text actually scrambles mid-animation (differs from the resolved phrase)",
    textMidScramble !== EXPECTED_TEXT,
    `text mid-scramble = ${JSON.stringify(textMidScramble)}`,
  );

  await page.waitForTimeout(DURATION_MS * 0.85); // past the remaining duration, with margin
  const textAfterSettle = normalizeNbsp(
    await root.evaluate((element) => element.textContent),
  );
  report(
    "hyperText: FINAL settled text matches the intended phrase after the scramble finishes",
    textAfterSettle === EXPECTED_TEXT,
    `text after settle = ${JSON.stringify(textAfterSettle)}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
