// Real-browser interaction check for backgroundRippleEffect — clicks a cell
// in the grid and asserts a real ripple actually starts: the clicked cell's
// own `style.animation` gets set (distance 0, so its delay is 0ms), and a
// far-away cell's animation gets a proportionally larger `animation-delay`,
// proving the ripple actually propagates outward rather than every cell
// lighting up in lockstep.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

// `element.style.animation` read back from the DOM serializes to the full
// longhand order (`duration timing-function delay iteration-count direction
// fill-mode play-state name`), not the shorthand order it was assigned in —
// so the delay is the *second* `<n>ms` token, not the last (the string ends
// with the keyframe name, e.g. "200ms ease-out 407.9ms 1 normal none running
// background-ripple-pulse-…").
function parseAnimationDelayMs(animation: string): number | null {
  const match = animation.match(/^[\d.]+ms\s+\S+\s+([\d.]+)ms/);
  return match ? Number(match[1]) : null;
}

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "backgroundRippleEffect");
    const rootLocator = await locate(page, "backgroundRippleEffect");
    const componentRoot = rootLocator.locator(".block-box > *").first();

    // Default grid is 8 rows x 27 columns, but it's both wider and taller
    // than the card's own clipped box (`justifyContent`/`alignContent:
    // "center"` on an oversized grid, inside `overflow: hidden`) — cells near
    // the edges (rows 0/7, columns 0-2/24-26) are clipped out of view. The
    // demo's own heading/paragraph overlay also sits on top of (and
    // intercepts clicks over) the first couple of visible rows. Row 2-6 /
    // column 3-23 clears both; pick two cells from opposite corners of that
    // zone for maximum ripple distance.
    const clickedCell = componentRoot.locator('[data-row="2"][data-col="3"]');
    const farCell = componentRoot.locator('[data-row="6"][data-col="23"]');

    const clickedCellCount = await clickedCell.count();
    if (clickedCellCount === 0) {
      report("backgroundRippleEffect grid cells", false, "no [data-row][data-col] cells found");
    } else {
      await clickedCell.click();
      await page.waitForTimeout(50);

      const clickedAnimation = await clickedCell.evaluate((el) => (el as HTMLElement).style.animation);
      const clickedDelay = parseAnimationDelayMs(clickedAnimation);
      report(
        "backgroundRippleEffect starts a ripple on the clicked cell",
        clickedAnimation !== "" && clickedAnimation !== "none" && clickedDelay === 0,
        `animation="${clickedAnimation}"`,
      );

      const farAnimation = await farCell.evaluate((el) => (el as HTMLElement).style.animation);
      const farDelay = parseAnimationDelayMs(farAnimation);
      report(
        "backgroundRippleEffect delays the ripple on a far-away cell (propagation)",
        farAnimation !== "" && farAnimation !== "none" && farDelay !== null && farDelay > 0,
        `animation="${farAnimation}"`,
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
