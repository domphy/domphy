// Real-browser interaction check for glowingEffect — moves the pointer to
// different points around the card and asserts the ring's
// `--glowing-effect-angle` custom property and opacity actually update in
// response to cursor position (proximity-gated, angle tracks direction from
// center), not a static glow.
//
// Test points are derived from the component's own gating math (proximity
// radius + central dead-zone fraction of the half-diagonal) rather than
// guessed screen coordinates: a point sitting `offset` px beyond a corner,
// along the ray from the card's center through that corner, is always both
// within the proximity radius (distance to the corner == `offset`) and
// outside the dead zone (distance from center == halfDiagonal + offset >
// halfDiagonal * inactiveZone) — regardless of the card's aspect ratio.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

const PROXIMITY_OFFSET_PX = 20; // comfortably inside the component's default 80px proximity radius

async function main() {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "glowingEffect");
    const rootLocator = await locate(page, "glowingEffect");
    const componentRoot = rootLocator.locator(".block-box > *").first();
    const glowLayer = componentRoot.locator("> div").first();

    const box = await componentRoot.boundingBox();
    if (!box) {
      report("glowingEffect bounds", false, "component root has no bounding box");
    } else {
      const readGlow = () =>
        glowLayer.evaluate((el) => ({
          opacity: (el as HTMLElement).style.opacity,
          angle: (el as HTMLElement).style.getPropertyValue("--glowing-effect-angle"),
        }));

      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      const halfDiagonal = Math.hypot(halfWidth, halfHeight);
      const scale = (halfDiagonal + PROXIMITY_OFFSET_PX) / halfDiagonal;

      const topLeftCornerPoint = { x: centerX - halfWidth * scale, y: centerY - halfHeight * scale };
      const bottomRightCornerPoint = { x: centerX + halfWidth * scale, y: centerY + halfHeight * scale };

      // Far outside the proximity radius (well beyond the default 80px) —
      // glow should be off.
      await page.mouse.move(centerX, box.y - 500);
      await page.waitForTimeout(700);
      const far = await readGlow();
      report("glowingEffect stays off when the pointer is far away", far.opacity === "0", `opacity=${far.opacity} angle=${far.angle}`);

      // Just beyond the top-left corner — within proximity, outside the dead
      // zone regardless of the card's aspect ratio (see module comment).
      await page.mouse.move(topLeftCornerPoint.x, topLeftCornerPoint.y);
      await page.waitForTimeout(900);
      const topLeft = await readGlow();
      // The displayed opacity is a per-frame lerp toward the target that
      // stops once it's within 0.01 of it (see glowingEffect.ts's `step`) —
      // it settles close to 1, not exactly "1".
      report(
        "glowingEffect lights up near a corner",
        Number.parseFloat(topLeft.opacity) > 0.9,
        `opacity=${topLeft.opacity} angle=${topLeft.angle} point=${JSON.stringify(topLeftCornerPoint)}`,
      );

      // Just beyond the diametrically opposite (bottom-right) corner — same
      // gating, but the tracked angle should point in the opposite direction.
      await page.mouse.move(bottomRightCornerPoint.x, bottomRightCornerPoint.y);
      await page.waitForTimeout(900);
      const bottomRight = await readGlow();
      const topLeftAngle = Number.parseFloat(topLeft.angle);
      const bottomRightAngle = Number.parseFloat(bottomRight.angle);
      const angleDelta = Math.abs(((bottomRightAngle - topLeftAngle + 540) % 360) - 180);
      report(
        "glowingEffect angle tracks pointer position (opposite corners ~180deg apart)",
        Number.parseFloat(bottomRight.opacity) > 0.9 && angleDelta > 150,
        `topLeftAngle=${topLeft.angle} bottomRightAngle=${bottomRight.angle} delta=${angleDelta}`,
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
