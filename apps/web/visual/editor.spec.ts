import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

/**
 * Real-browser checks for @domphy/editor, solo-mounted via the standalone
 * catalog's `?catalog=editor&only=<demo>` mode (the docs demos:
 * quickstart | toolbar | bubble-menu):
 *
 *   pnpm --filter domphy-web visual:editor
 *
 * Covers the enterprise-critical interactions a unit test cannot reach:
 * typing through `beforeinput`, mark toggling via Mod+B and toolbar buttons,
 * Enter in / out of a list, undo/redo, and the selection-anchored bubble
 * menu's visibility + in-viewport positioning at 375/768/1280 widths.
 * Screenshots land in .ui-qa/editor/.
 */

const axeSource = readFileSync(
  createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  "utf8",
);

const shotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".ui-qa",
  "editor",
);
mkdirSync(shotsDir, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-375x667", width: 375, height: 667 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

type DemoName = "quickstart" | "toolbar" | "bubble-menu";

function soloUrl(demo: DemoName): string {
  return `/?catalog=editor&only=${demo}`;
}

function editorSurface(page: Page, demo: DemoName) {
  return page.locator(`[data-visual='editor-${demo}'] [contenteditable]`);
}

async function openSolo(page: Page, demo: DemoName): Promise<string[]> {
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) =>
    consoleErrors.push(String(error.message).slice(0, 200)),
  );
  await page.goto(soloUrl(demo), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-visual-ready='1']", { timeout: 60_000 });
  await expect(editorSurface(page, demo)).toBeVisible();
  await page.waitForTimeout(300);
  return consoleErrors;
}

test.describe("quickstart demo", () => {
  for (const viewport of VIEWPORTS) {
    test(`renders + accepts input @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const consoleErrors = await openSolo(page, "quickstart");
      const surface = editorSurface(page, "quickstart");

      // Seeded content came through the HTML parse path.
      await expect(surface.locator("h2")).toContainText(
        "A self-contained editor",
      );
      await expect(surface.locator("ul li").first()).toContainText(
        "Bullet lists",
      );

      // Type into the first list item: click, jump to line end, type.
      await surface.locator("ul li", { hasText: "Bullet lists" }).click();
      await page.keyboard.press("End");
      await page.keyboard.type(" — typed live");
      await expect(surface.locator("ul li").first()).toContainText(
        "typed live",
      );

      await page.screenshot({
        path: join(shotsDir, `quickstart-${viewport.name}.png`),
      });
      expect(
        consoleErrors,
        `page errors: ${consoleErrors.join(" | ")}`,
      ).toEqual([]);
    });
  }

  test("Mod+B bolds the selected word, Mod+Z reverts", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSolo(page, "quickstart");
    const surface = editorSurface(page, "quickstart");

    // dblclick near the text start — clicking the element CENTER of a
    // full-width block lands in the empty box past the text and produces a
    // cross-block selection instead of a word selection.
    await surface.locator("h2").dblclick({ position: { x: 24, y: 12 } });
    await page.keyboard.press("Control+b");
    await expect(surface.locator("h2 strong")).toHaveCount(1);

    await page.keyboard.press("Control+z");
    await expect(surface.locator("h2 strong")).toHaveCount(0);
    await page.keyboard.press("Control+Shift+z");
    await expect(surface.locator("h2 strong")).toHaveCount(1);
  });

  test("Enter splits a list item, Enter on an empty item exits the list", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSolo(page, "quickstart");
    const surface = editorSurface(page, "quickstart");

    await surface.locator("ul li", { hasText: "Bullet lists" }).click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("New item");
    await expect(surface.locator("ul li")).toHaveCount(3);
    await expect(surface.locator("ul li").nth(1)).toContainText("New item");

    // A second Enter leaves an empty item; the third breaks out of the list.
    await page.keyboard.press("Enter");
    await expect(surface.locator("ul li")).toHaveCount(4);
    await page.keyboard.press("Enter");
    await expect(surface.locator("ul li")).toHaveCount(3);
  });

  test("'# ' input rule turns the paragraph into a heading", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSolo(page, "quickstart");
    const surface = editorSurface(page, "quickstart");

    // Break out of the list into a fresh paragraph, then apply the rule.
    await surface.locator("ul li", { hasText: "Bullet lists" }).click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("# ");
    await expect(surface.locator("h1")).toHaveCount(1);
    await page.keyboard.type("Rule title");
    await expect(surface.locator("h1")).toContainText("Rule title");
  });
});

test.describe("toolbar demo", () => {
  test("toolbar buttons drive commands and pressed state", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const consoleErrors = await openSolo(page, "toolbar");
    const surface = editorSurface(page, "toolbar");
    const cell = page.locator("[data-visual='editor-toolbar']");

    // Select a word, then bold it from the toolbar.
    await surface
      .locator("p")
      .first()
      .dblclick({ position: { x: 24, y: 12 } });
    await cell.locator("button", { hasText: /^B$/ }).click();
    await expect(surface.locator("p strong").first()).toHaveCount(1);
    await expect(cell.locator("button", { hasText: /^B$/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Caret into the blockquote lights up its toggle.
    await surface.locator("blockquote p").click();
    await expect(
      cell.locator("button", { hasText: /^Quote$/ }),
    ).toHaveAttribute("aria-pressed", "true");

    // Insert a table from the toolbar; the caret lands in the first cell.
    await cell.locator("button", { hasText: /^Table$/ }).click();
    await expect(surface.locator("table")).toHaveCount(1);
    await expect(surface.locator("th")).toHaveCount(3);

    // Undo + redo buttons follow can() state and work.
    await cell.locator("button", { hasText: /^Undo$/ }).click();
    await expect(surface.locator("table")).toHaveCount(0);
    await cell.locator("button", { hasText: /^Redo$/ }).click();
    await expect(surface.locator("table")).toHaveCount(1);

    expect(consoleErrors, `page errors: ${consoleErrors.join(" | ")}`).toEqual(
      [],
    );
  });
});

test.describe("bubble-menu demo", () => {
  for (const viewport of VIEWPORTS) {
    test(`menu appears on selection, in-viewport @ ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const consoleErrors = await openSolo(page, "bubble-menu");
      const surface = editorSurface(page, "bubble-menu");
      const menu = page.locator("[role='toolbar']");

      // Nothing selected: the panel is not even mounted yet.
      await expect(menu).toHaveCount(0);

      await surface.locator("h2").dblclick({ position: { x: 24, y: 12 } });
      await expect(menu).toBeVisible();

      // Fully inside the viewport, both axes.
      const box = await menu.boundingBox();
      expect(box, "menu has no bounding box").not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);

      // A menu button applies its command without collapsing the selection.
      await menu.locator("button", { hasText: /^B$/ }).click();
      await expect(surface.locator("h2 strong")).toHaveCount(1);

      await page.screenshot({
        path: join(shotsDir, `bubble-menu-${viewport.name}.png`),
      });

      // Collapsing the selection hides the menu again.
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(200);
      await expect(menu).toBeHidden();

      expect(
        consoleErrors,
        `page errors: ${consoleErrors.join(" | ")}`,
      ).toEqual([]);
    });
  }
});

test.describe("accessibility", () => {
  // Scoped to the editing surface + bubble menu (editor's own output). The
  // toolbar demo's chrome buttons are @domphy/ui's buttonGhost and the docs
  // demos' markup — audited in their own lanes.
  for (const demo of ["quickstart", "bubble-menu"] as const) {
    test(`axe clean on the editor surface (${demo})`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await openSolo(page, demo);
      if (demo === "bubble-menu") {
        // Open the menu so its markup is audited too.
        await editorSurface(page, demo)
          .locator("h2")
          .dblclick({ position: { x: 24, y: 12 } });
        await expect(page.locator("[role='toolbar']")).toBeVisible();
      }
      await page.evaluate(axeSource);
      const violations = await page.evaluate(async (selector) => {
        const run = await (
          window as unknown as { axe: typeof import("axe-core") }
        ).axe.run(document.querySelector(selector) as Element, {
          resultTypes: ["violations"],
        });
        return run.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.map((node) => node.target.join(" ")),
        }));
      }, `[data-visual='editor-${demo}']`);
      expect(violations, JSON.stringify(violations)).toEqual([]);
    });
  }
});
