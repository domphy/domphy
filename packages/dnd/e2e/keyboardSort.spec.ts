import { expect, test } from "@playwright/test";

// Real-Chromium evidence for the keyboard-operable reorder alternative
// (WCAG 2.2 SC 2.5.7 "Dragging Movements" / SC 2.1.1 "Keyboard") that
// packages/dnd/src/keyboardSort.ts implements. jsdom (keyboardSort.test.ts)
// exercises the same code paths but has no real focus/blur/scrollIntoView
// behavior — this spec is what proves the feature actually works for a
// keyboard user in a browser.

test.describe("keyboardSort — single list", () => {
  test("space picks up, arrow moves, space drops, order persists", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    const list = page.locator("#single-list li");
    await expect(list).toHaveCount(3);
    await expect(list.nth(0)).toHaveText("Alpha");

    await list.nth(0).focus();
    await page.keyboard.press("Space");
    await expect(list.nth(0)).toHaveAttribute("data-grabbed", "true");

    await page.keyboard.press("ArrowDown");
    // Alpha now at index 1 — Bravo moved up to index 0.
    await expect(list.nth(0)).toHaveText("Bravo");
    await expect(list.nth(1)).toHaveText("Alpha");
    await expect(list.nth(1)).toHaveAttribute("data-grabbed", "true");

    await page.keyboard.press("Space");
    await expect(list.nth(1)).not.toHaveAttribute("data-grabbed", "true");
    // Order committed — Bravo, Alpha, Charlie.
    await expect(list).toHaveText(["Bravo", "Alpha", "Charlie"]);
  });

  test("escape restores the original order", async ({ page }) => {
    await page.goto("/demo.html");
    const list = page.locator("#single-list li");

    await list.nth(0).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("End");
    await expect(list).toHaveText(["Bravo", "Charlie", "Alpha"]);

    await page.keyboard.press("Escape");
    await expect(list).toHaveText(["Alpha", "Bravo", "Charlie"]);
    await expect(list.first()).not.toHaveAttribute("data-grabbed", "true");
  });

  test("announces pick-up, move and drop through the live region", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    const list = page.locator("#single-list li");
    const liveRegion = page.locator('[aria-live="assertive"]');

    await list.nth(0).focus();
    await page.keyboard.press("Space");
    await expect(liveRegion).toContainText("grabbed");

    await page.keyboard.press("ArrowDown");
    await expect(liveRegion).toContainText("moved to position 2");

    await page.keyboard.press("Space");
    await expect(liveRegion).toContainText("dropped");
  });

  test("blur while held commits the move instead of leaving a stuck grab", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    const list = page.locator("#single-list li");

    await list.nth(0).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    // Tab away without dropping explicitly.
    await page.keyboard.press("Tab");

    await expect(page.locator("[data-grabbed]")).toHaveCount(0);
    await expect(list).toHaveText(["Bravo", "Alpha", "Charlie"]);
  });
});

test.describe("keyboardSort — cross-list transfer", () => {
  test("ArrowRight moves an item from todo to done", async ({ page }) => {
    await page.goto("/demo.html");
    const todo = page.locator("#todo-list li");
    const done = page.locator("#done-list li");
    await expect(todo).toHaveText(["Write docs", "Fix bug"]);
    await expect(done).toHaveText(["Ship release"]);

    await todo.nth(0).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");

    await expect(todo).toHaveText(["Fix bug"]);
    // Lands at the same ordinal it held in "todo" (index 0), clamped to
    // "done"'s length — the react-beautiful-dnd cross-list keyboard model
    // (see keyboardSort.ts's `transfer()`), not appended at the end.
    await expect(done).toHaveText(["Write docs", "Ship release"]);
    // The transferred item keeps the grab and focus in its new list.
    await expect(done.nth(0)).toHaveAttribute("data-grabbed", "true");
    await expect(done.nth(0)).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("[data-grabbed]")).toHaveCount(0);
  });
});

test.describe("keyboardSort — two independent sessions on one page", () => {
  test("grabbing in one list does not mark an item in the other session", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    // #single-list and #todo-list/#done-list are two independent
    // keyboardSort()/keyboardSortGroup() sessions (see demo-main.ts) — each
    // gets its own session id (Session.id in keyboardSort.ts), so grabbing
    // in one must never satisfy a `[data-grab-session]` query meant for the
    // other.
    await page.locator("#single-list li").first().focus();
    await page.keyboard.press("Space");

    await expect(page.locator("#single-list [data-grabbed]")).toHaveCount(1);
    await expect(page.locator("#todo-list [data-grabbed]")).toHaveCount(0);
    await expect(page.locator("#done-list [data-grabbed]")).toHaveCount(0);
  });
});

test.describe("keyboardSort — autoscroll", () => {
  test("moving an item past the visible edge scrolls the overflow container", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    const container = page.locator("#scroll-container");
    const firstItem = page.locator("#scroll-list li").first();

    await expect(container).toHaveJSProperty("scrollTop", 0);
    await firstItem.focus();
    await page.keyboard.press("Space");
    // Item 1 starts at the top of a 20-item, 150px-tall viewport — move it
    // far enough down that it leaves the visible area without an explicit
    // scroll.
    for (let step = 0; step < 10; step++) {
      await page.keyboard.press("ArrowDown");
    }
    await page.keyboard.press("Space");

    const scrollTop = await container.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);

    // The moved item (now "Item 1", 10 slots down) must be within the
    // container's visible viewport, not just scrolled somewhere.
    const movedItem = page.locator("#scroll-list li", { hasText: /^Item 1$/ });
    await expect(movedItem).toBeVisible();
    const itemBox = await movedItem.boundingBox();
    const containerBox = await container.boundingBox();
    expect(itemBox).not.toBeNull();
    expect(containerBox).not.toBeNull();
    if (itemBox && containerBox) {
      expect(itemBox.y).toBeGreaterThanOrEqual(containerBox.y - 1);
      expect(itemBox.y + itemBox.height).toBeLessThanOrEqual(
        containerBox.y + containerBox.height + 1,
      );
    }
  });
});
