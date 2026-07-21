import { expect, type Locator, type Page, test } from "@playwright/test";

async function closeBlockingOverlays(page: Page): Promise<void> {
  // Catalog force-opens dialogs/drawers; top-layer modals steal pointer events
  // from later hover/focus cells. Hide every open dialog between captures.
  await page.evaluate(() => {
    for (const dialog of document.querySelectorAll("dialog")) {
      const el = dialog as HTMLDialogElement;
      try {
        if (el.open) el.close();
      } catch {
        el.removeAttribute("open");
      }
      el.style.setProperty("display", "none");
    }
    // Popover/floating panels often portal to body with high z-index.
    for (const panel of document.querySelectorAll(
      "[data-floating], [data-popover], [role='menu'], [role='listbox'], [role='tooltip']",
    )) {
      (panel as HTMLElement).style.setProperty("visibility", "hidden");
    }
  });
}

async function prepareCell(page: Page, cell: Locator): Promise<void> {
  await closeBlockingOverlays(page);

  // Re-show overlays that live inside this cell (dialog/drawer demos).
  const dialog = cell.locator("dialog").first();
  if ((await dialog.count()) > 0) {
    await page.evaluate((el) => {
      const d = el as HTMLDialogElement;
      d.style.removeProperty("display");
      try {
        if (typeof d.showModal === "function") d.showModal();
        else d.setAttribute("open", "");
      } catch {
        d.setAttribute("open", "");
      }
    }, await dialog.elementHandle());
  }
  // Unhide floating panels under this cell.
  await cell.evaluate((root) => {
    for (const panel of root.querySelectorAll(
      "[data-floating], [data-popover], [role='menu'], [role='listbox'], [role='tooltip']",
    )) {
      (panel as HTMLElement).style.removeProperty("visibility");
    }
  });

  const focus = await cell.getAttribute("data-visual-focus");
  const hover = await cell.getAttribute("data-visual-hover");
  if (focus) {
    const target = cell.locator("button, a, input, textarea, select").first();
    if ((await target.count()) > 0) {
      await target.focus({ timeout: 5_000 });
    }
  }
  if (hover) {
    await cell.hover({ timeout: 5_000, force: true });
  }
}

async function screenshotCatalog(
  page: Page,
  catalog: "patches" | "blocks",
  opts: {
    idPrefix?: string;
    limit?: number;
    theme?: "light" | "dark";
  } = {},
): Promise<void> {
  const theme = opts.theme ?? "light";
  const url = `/?catalog=${catalog}&theme=${theme}`;
  await page.goto(url);
  await page.waitForSelector("[data-visual-ready]", { timeout: 120_000 });
  await page.waitForSelector("[data-visual-page]", { timeout: 30_000 });
  // Charts / fonts / layout settle.
  await page.waitForTimeout(800);

  const cells = page.locator("[data-visual]");
  const count = await cells.count();
  if (count === 0) {
    throw new Error(
      `No [data-visual] cells for catalog=${catalog} — did the standalone entry crash?`,
    );
  }

  const end = opts.limit != null ? Math.min(count, opts.limit) : count;
  for (let i = 0; i < end; i++) {
    const cell = cells.nth(i);
    const id = await cell.getAttribute("data-visual");
    if (!id) {
      throw new Error(`Cell at index ${i} missing data-visual`);
    }
    await cell.scrollIntoViewIfNeeded();
    await prepareCell(page, cell);
    const fileName = `${opts.idPrefix ?? ""}${id}.png`;
    await expect(cell).toHaveScreenshot(fileName, { animations: "disabled" });
  }
}

test.describe("Domphy visual catalogs", () => {
  test("patches catalog screenshots", async ({ page }) => {
    test.setTimeout(300_000);
    await screenshotCatalog(page, "patches");
  });

  test("blocks catalog screenshots", async ({ page }) => {
    test.setTimeout(900_000);
    await screenshotCatalog(page, "blocks");
  });

  test("patches dark theme sample", async ({ page }) => {
    test.setTimeout(120_000);
    await screenshotCatalog(page, "patches", {
      theme: "dark",
      idPrefix: "dark-",
      limit: 30,
    });
  });
});
