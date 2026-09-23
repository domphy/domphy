import { expect, test } from "@playwright/test";

// Real-Chromium evidence for createFloating()/computePosition()/autoUpdate —
// the layout-dependent parts jsdom (packages/floating/tests/*.test.ts)
// cannot exercise: a real getBoundingClientRect, a real flip() decision near
// a viewport edge, and a real scroll-triggered autoUpdate reposition.

test.describe("createFloating — basic positioning", () => {
  test("connects on trigger click and computes a position below the anchor", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    const trigger = page.locator("#anchor-top");
    const panel = page.locator("#panel-top");

    await expect(panel).toBeHidden();
    await trigger.click();
    await expect(panel).toBeVisible();

    const triggerBox = await trigger.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    if (triggerBox && panelBox) {
      // offset(8) below the trigger: panel top >= trigger bottom.
      expect(panelBox.y).toBeGreaterThanOrEqual(
        triggerBox.y + triggerBox.height,
      );
    }
    await expect(panel).toHaveAttribute("data-placement", "bottom");
  });

  test("Escape and outside click both dismiss", async ({ page }) => {
    await page.goto("/demo.html");
    const trigger = page.locator("#anchor-top");
    const panel = page.locator("#panel-top");

    await trigger.click();
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();

    await trigger.click();
    await expect(panel).toBeVisible();
    await page.mouse.click(500, 400);
    await expect(panel).toBeHidden();
  });
});

test.describe("createFloating — flip() near a viewport edge", () => {
  test("a panel that would overflow the bottom flips to top", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    // The bottom anchor sits near the end of a tall scrollable page — scroll
    // it into view first so its own position (not scroll offset) drives the
    // flip decision the same way a real trigger click would.
    const trigger = page.locator("#anchor-bottom");
    await trigger.scrollIntoViewIfNeeded();
    const panel = page.locator("#panel-bottom");

    await trigger.click();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("data-placement", "top");

    const triggerBox = await trigger.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    if (triggerBox && panelBox) {
      // Flipped above the trigger: panel bottom <= trigger top.
      expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(
        triggerBox.y + 1,
      );
    }
  });
});

test.describe("createFloating — autoUpdate on ancestor scroll", () => {
  test("scrolling the reference's scroll container repositions the panel", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    // #anchor-scroll sits inside #scroll-wrap (a 150px-tall overflow:auto
    // container); #panel-scroll is `strategy: "fixed"` and lives OUTSIDE
    // that container in the DOM. A working autoUpdate listens for scroll on
    // every overflow ancestor of the REFERENCE (not just the floating
    // element's own), so scrolling #scroll-wrap alone — no window scroll,
    // no resize — must still move the panel. A stale/one-shot
    // computePosition would leave it exactly where it first opened.
    const trigger = page.locator("#anchor-scroll");
    const panel = page.locator("#panel-scroll");
    const container = page.locator("#scroll-wrap");

    await trigger.click(); // Playwright auto-scrolls the container to reveal it.
    await expect(panel).toBeVisible();
    const before = await panel.boundingBox();
    expect(before).not.toBeNull();

    await container.evaluate((el) => {
      el.scrollTop += 80;
    });
    await page.waitForTimeout(50);

    const triggerAfter = await trigger.boundingBox();
    const panelAfter = await panel.boundingBox();
    expect(triggerAfter).not.toBeNull();
    expect(panelAfter).not.toBeNull();
    if (before && triggerAfter && panelAfter) {
      // The panel moved at all (it's tracking the reference, not frozen)...
      expect(Math.abs(panelAfter.y - before.y)).toBeGreaterThan(1);
      // ...and it moved to stay adjacent to the reference's NEW position
      // (offset(8) to the right), not to some unrelated location.
      expect(panelAfter.x).toBeGreaterThanOrEqual(
        triggerAfter.x + triggerAfter.width,
      );
    }
  });
});
