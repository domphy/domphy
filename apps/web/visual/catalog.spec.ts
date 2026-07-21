import { test, expect, type Locator, type Page } from "@playwright/test";

async function prepareCell(cell: Locator): Promise<void> {
  const focus = await cell.getAttribute("data-visual-focus");
  const hover = await cell.getAttribute("data-visual-hover");
  if (focus) {
    const target = cell.locator("button, a, input, textarea, select").first();
    if ((await target.count()) > 0) {
      await target.focus();
    }
  }
  if (hover) {
    await cell.hover();
  }
}

async function screenshotCatalog(
  page: Page,
  path: string,
  opts: {
    idPrefix?: string;
    limit?: number;
    /** Set on <html> after navigation (e.g. "dark"). */
    dataTheme?: string;
  } = {},
): Promise<void> {
  await page.goto(path);
  await page.waitForSelector("[data-visual-page]");
  if (opts.dataTheme) {
    await page.evaluate((theme) => {
      document.documentElement.setAttribute("data-theme", theme);
    }, opts.dataTheme);
  }
  // Islands mount async; give charts / effects a beat to paint.
  await page.waitForTimeout(1000);

  const cells = page.locator("[data-visual]");
  const count = await cells.count();
  if (count === 0) {
    throw new Error(
      `No [data-visual] cells found on ${path} — is the catalog page built and the preview island mounted?`,
    );
  }

  const end = opts.limit != null ? Math.min(count, opts.limit) : count;
  for (let i = 0; i < end; i++) {
    const cell = cells.nth(i);
    const id = await cell.getAttribute("data-visual");
    if (!id) {
      throw new Error(`Cell at index ${i} on ${path} is missing data-visual`);
    }
    await cell.scrollIntoViewIfNeeded();
    await prepareCell(cell);
    const fileName = `${opts.idPrefix ?? ""}${id}.png`;
    await expect(cell).toHaveScreenshot(fileName, { animations: "disabled" });
  }
}

test.describe("Domphy visual catalogs", () => {
  test("patches catalog screenshots", async ({ page }) => {
    await screenshotCatalog(page, "/docs/visual/patches");
  });

  test("blocks catalog screenshots", async ({ page }) => {
    await screenshotCatalog(page, "/docs/visual/blocks");
  });

  test("patches dark theme", async ({ page }) => {
    await screenshotCatalog(page, "/docs/visual/patches", {
      dataTheme: "dark",
      idPrefix: "dark-",
      limit: 20,
    });
  });
});
