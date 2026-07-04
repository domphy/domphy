// Real browser check for parallaxHeroImages.
//
// NOTE: despite the name, this component's parallax is POINTER-move-driven,
// not scroll-driven (see the file's own header comment — `pointermove`
// updates a target offset, rAF-lerped per image). It has no scroll listener
// at all. So "scroll the page" (the generic instruction for this pair of
// blocks) doesn't apply here; a real `page.mouse.move()` across the section
// is the actual, correct interaction to drive and assert against.
//
// Each image slot is tagged "edge" or "middle" tier, and the two tiers get a
// DIFFERENT depth factor (edge=0.35, middle=1 by default) — moving the
// pointer should displace the two tiers by different amounts, proving real
// per-layer parallax (not everything moving together at the same rate).
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const NAME = "parallaxHeroImages";

function parseTranslate(transform: string): { x: number; y: number } | null {
  const match = transform.match(/translate3d\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/);
  if (!match) return null;
  return { x: Number.parseFloat(match[1]!), y: Number.parseFloat(match[2]!) };
}

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);
    const section = block.locator("section").first();
    // Slot 0 is tier "edge" (far, depth factor 0.35 by default), slot 1 is
    // tier "middle" (close, depth factor 1) — see SLOTS in the component source.
    const edgeImage = section.locator("> div").nth(0);
    const middleImage = section.locator("> div").nth(1);

    const box = await section.boundingBox();
    if (!box) throw new Error("parallaxHeroImages section has no bounding box");

    // Move to a point strongly offset toward the right edge, well within
    // the section, to generate a large, real pointer-driven target.
    const targetX = box.x + box.width * 0.92;
    const targetY = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(targetX, targetY, { steps: 8 });
    await page.waitForTimeout(700);

    const edgeTransform = await edgeImage.evaluate((el) => (el as HTMLElement).style.transform);
    const middleTransform = await middleImage.evaluate((el) => (el as HTMLElement).style.transform);
    const edgeOffset = parseTranslate(edgeTransform);
    const middleOffset = parseTranslate(middleTransform);

    report(
      `${NAME}: pointer movement actually displaces the images (real translate3d offset)`,
      edgeOffset !== null && middleOffset !== null && (Math.abs(edgeOffset.x) > 1 || Math.abs(middleOffset.x) > 1),
      `edge transform="${edgeTransform}", middle transform="${middleTransform}"`,
    );

    const edgeMagnitude = edgeOffset ? Math.abs(edgeOffset.x) : 0;
    const middleMagnitude = middleOffset ? Math.abs(middleOffset.x) : 0;
    report(
      `${NAME}: "middle" tier (depth factor 1) moves further than "edge" tier (0.35) — real per-layer parallax`,
      middleMagnitude > edgeMagnitude * 1.4,
      `edge |x|=${edgeMagnitude.toFixed(2)}px, middle |x|=${middleMagnitude.toFixed(2)}px`,
    );

    await page.mouse.move(box.x - 40, box.y - 40);
    await page.waitForTimeout(700);
    const edgeTransformAfterLeave = await edgeImage.evaluate((el) => (el as HTMLElement).style.transform);
    const edgeOffsetAfterLeave = parseTranslate(edgeTransformAfterLeave);
    report(
      `${NAME}: pointer leaving the section eases images back to a neutral resting offset`,
      edgeOffsetAfterLeave !== null && Math.abs(edgeOffsetAfterLeave.x) < 1 && Math.abs(edgeOffsetAfterLeave.y) < 1,
      `edge transform after leave="${edgeTransformAfterLeave}"`,
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
