import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

/**
 * Interaction + responsive checks for representative @domphy/ui patches
 * (dialog, drawer, tooltip, popover, selectBox, combobox, datePicker, menu,
 * tabs, accordion, toast, select), solo-mounted via the standalone catalog's
 * `?catalog=uioverlays&only=<name>` mode:
 *
 *   pnpm --filter domphy-web visual:ui-overlays
 *
 * Render sweep per patch × 375/768/1280: zero page errors, no horizontal
 * overflow, screenshot to .ui-qa/ui/. Overlay patches additionally get open/
 * positioning/Escape/outside-click/focus-trap interaction tests at the
 * viewport extremes.
 */

const shotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".ui-qa",
  "ui",
);
mkdirSync(shotsDir, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-375x667", width: 375, height: 667 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

const DEMOS = [
  "dialog",
  "drawer",
  "tooltip",
  "popover",
  "selectBox",
  "combobox",
  "datePicker",
  "menu",
  "tabs",
  "accordion",
  "toast",
  "select",
] as const;

type DemoName = (typeof DEMOS)[number];

function soloUrl(demo: DemoName): string {
  return `/?catalog=uioverlays&only=${demo}`;
}

async function openSolo(page: Page, demo: DemoName): Promise<string[]> {
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) =>
    consoleErrors.push(String(error.message).slice(0, 200)),
  );
  await page.goto(soloUrl(demo), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-visual-ready='1']", { timeout: 60_000 });
  await page.waitForTimeout(400);
  return consoleErrors;
}

/** No element may push the document wider than the viewport. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const slack = 1;
    const docOverflow = doc.scrollWidth - doc.clientWidth;
    const offenders: string[] = [];
    if (docOverflow > slack) {
      for (const el of document.querySelectorAll("body *")) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.right > doc.clientWidth + slack) {
          const tag = el.tagName.toLowerCase();
          const cls = (el.getAttribute("class") ?? "").slice(0, 60);
          offenders.push(`${tag}.${cls} right=${Math.round(rect.right)}`);
          if (offenders.length >= 5) break;
        }
      }
    }
    return { docOverflow, offenders };
  });
  expect(
    overflow.docOverflow,
    `horizontal overflow ${overflow.docOverflow}px; offenders: ${overflow.offenders.join(" | ")}`,
  ).toBeLessThanOrEqual(1);
}

/** A visible overlay panel must lie fully inside the viewport horizontally. */
async function expectWithinViewportX(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  label: string,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, `${label} has no bounding box`).not.toBeNull();
  const viewportWidth = page.viewportSize()!.width;
  expect(box!.x, `${label} left edge ${box!.x} < 0`).toBeGreaterThanOrEqual(-1);
  expect(
    box!.x + box!.width,
    `${label} right edge ${box!.x + box!.width} > ${viewportWidth}`,
  ).toBeLessThanOrEqual(viewportWidth + 1);
}

for (const viewport of VIEWPORTS) {
  for (const demo of DEMOS) {
    test(`${demo} renders @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const consoleErrors = await openSolo(page, demo);
      await expect(page.locator(`[data-visual='ui-${demo}']`)).toBeVisible();
      await expectNoHorizontalOverflow(page);
      expect(
        consoleErrors,
        `page errors: ${consoleErrors.join(" | ")}`,
      ).toEqual([]);
      await page.screenshot({
        path: join(shotsDir, `${demo}-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }
}

test("dialog: open, focus trap, Escape close, focus restore @ 1280px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = await openSolo(page, "dialog");
  const trigger = page.getByRole("button", { name: "Open dialog" });
  const dlg = page.locator("dialog");

  await trigger.click();
  await page.waitForTimeout(400); // open fade
  await expect(dlg).toBeVisible();
  expect(await dlg.getAttribute("aria-modal")).toBe("true");
  await expectWithinViewportX(page, dlg, "dialog");

  // Focus moved inside; Tab stays trapped (only the Close button is focusable).
  const focusedInside = await page.evaluate(() => {
    const d = document.querySelector("dialog")!;
    return d.contains(document.activeElement);
  });
  expect(focusedInside).toBe(true);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const stillInside = await page.evaluate(() => {
    const d = document.querySelector("dialog")!;
    return d.contains(document.activeElement);
  });
  expect(stillInside).toBe(true);

  await page.screenshot({ path: join(shotsDir, "dialog-open-desktop.png") });

  // Escape closes (animated close + fallback).
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  await expect(dlg).toBeHidden();
  // Focus restored to the trigger.
  const restored = await page.evaluate(
    () => document.activeElement?.textContent === "Open dialog",
  );
  expect(restored).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test("dialog: outside (backdrop) click closes @ 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "dialog");
  const dlg = page.locator("dialog");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await page.waitForTimeout(400);
  await expect(dlg).toBeVisible();
  await expectWithinViewportX(page, dlg, "dialog");
  // Backdrop: a point on the dialog element but outside its content rect.
  await page.mouse.click(4, 4);
  await page.waitForTimeout(700);
  await expect(dlg).toBeHidden();
  expect(consoleErrors).toEqual([]);
});

test("drawer: slides in from the end edge, Escape + backdrop close @ 375px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "drawer");
  const dlg = page.locator("dialog");

  await page.getByRole("button", { name: "Open drawer" }).click();
  await page.waitForTimeout(500); // slide-in transition
  await expect(dlg).toBeVisible();
  await expectWithinViewportX(page, dlg, "drawer");
  const box = await dlg.boundingBox();
  // placement "end": anchored to the right edge, full height.
  expect(box!.x + box!.width).toBeGreaterThan(375 - 2);
  expect(box!.height).toBeGreaterThan(600);
  await page.screenshot({ path: join(shotsDir, "drawer-open-mobile.png") });

  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  await expect(dlg).toBeHidden();

  // Reopen, then dismiss via backdrop click.
  await page.getByRole("button", { name: "Open drawer" }).click();
  await page.waitForTimeout(500);
  await expect(dlg).toBeVisible();
  await page.mouse.click(4, 4);
  await page.waitForTimeout(700);
  await expect(dlg).toBeHidden();
  expect(consoleErrors).toEqual([]);
});

test("tooltip: hover shows, Escape hides @ 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = await openSolo(page, "tooltip");
  const trigger = page.getByRole("button", { name: "Hover me" });
  await trigger.hover();
  await page.waitForTimeout(300); // show debounce
  const tip = page.getByRole("tooltip");
  await expect(tip).toBeVisible();
  await expectWithinViewportX(page, tip, "tooltip");
  // aria-describedby links trigger and panel.
  const describedBy = await trigger.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  expect(await tip.getAttribute("id")).toBe(describedBy);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await expect(tip).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("popover: opens within viewport, Escape closes @ 375px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "popover");
  const trigger = page.getByRole("button", { name: "Open popover" });
  await trigger.click();
  await page.waitForTimeout(300);
  const panel = page.locator("#domphy-floating [role='dialog']");
  await expect(panel).toBeVisible();
  await expectWithinViewportX(
    page,
    page.locator("#domphy-floating"),
    "popover panel",
  );
  await page.screenshot({ path: join(shotsDir, "popover-open-mobile.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await expect(panel).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("selectBox: opens, option click selects + closes @ 375px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "selectBox");
  const box = page.locator("[data-visual='ui-selectBox'] > div").first();
  await box.click();
  await page.waitForTimeout(300);
  const overlay = page.locator("#domphy-floating");
  await expect(overlay.getByRole("button", { name: "Beta" })).toBeVisible();
  await expectWithinViewportX(page, overlay, "selectBox panel");
  await overlay.getByRole("button", { name: "Beta" }).click();
  await page.waitForTimeout(300);
  // Panel closed (single select) and the tag shows the new value.
  await expect(overlay.getByRole("button", { name: "Beta" })).toHaveCount(0);
  await expect(box.getByText("Beta")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("combobox: focus opens, option click selects + closes @ 375px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "combobox");
  const input = page.locator("[data-visual='ui-combobox'] input");
  await input.focus();
  await page.waitForTimeout(300);
  const overlay = page.locator("#domphy-floating");
  await expect(overlay.getByRole("button", { name: "Gamma" })).toBeVisible();
  await expectWithinViewportX(page, overlay, "combobox panel");
  await overlay.getByRole("button", { name: "Gamma" }).click();
  await page.waitForTimeout(300);
  await expect(overlay.getByRole("button", { name: "Gamma" })).toHaveCount(0);
  await expect(
    page.locator("[data-visual='ui-combobox']").getByText("Gamma"),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("datePicker: opens within viewport, day select writes value + closes @ 375px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "datePicker");
  const input = page.locator("[data-visual='ui-datePicker'] input");
  await input.click();
  await page.waitForTimeout(300);
  const overlay = page.locator("#domphy-floating");
  await expect(overlay.locator("[role='gridcell']").first()).toBeVisible();
  await expectWithinViewportX(page, overlay, "datePicker panel");
  await page.screenshot({ path: join(shotsDir, "datePicker-open-mobile.png") });
  // Click the 15th of the CURRENT month (in-month cell, not a sibling-month gray).
  const day = overlay
    .locator("[role='gridcell']:not([aria-disabled='true'])", {
      hasText: /^15$/,
    })
    .first();
  await day.click();
  await page.waitForTimeout(300);
  await expect(overlay.locator("[role='gridcell']")).toHaveCount(0);
  await expect(input).toHaveValue(/15/);
  expect(consoleErrors).toEqual([]);
});

test("menu: arrow-key navigation + Enter activates @ 1280px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = await openSolo(page, "menu");
  const first = page.getByRole("menuitem", { name: "Profile" });
  const second = page.getByRole("menuitem", { name: "Settings" });
  await first.focus();
  await page.keyboard.press("ArrowDown");
  expect(await second.evaluate((el) => el === document.activeElement)).toBe(
    true,
  );
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  expect(await second.getAttribute("aria-current")).toBe("true");
  expect(consoleErrors).toEqual([]);
});

test("tabs: arrow-key nav moves selection + focus @ 1280px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = await openSolo(page, "tabs");
  const first = page.getByRole("tab", { name: "Overview" });
  const second = page.getByRole("tab", { name: "API" });
  await first.click();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  expect(await second.getAttribute("aria-selected")).toBe("true");
  expect(await second.evaluate((el) => el === document.activeElement)).toBe(
    true,
  );
  // Roving tabindex: only the selected tab stays in the tab order.
  expect(await first.getAttribute("tabindex")).toBe("-1");
  expect(await second.getAttribute("tabindex")).toBe("0");
  await expect(page.getByRole("tabpanel")).toContainText("API panel");
  expect(consoleErrors).toEqual([]);
});

test("accordion: single mode auto-closes the sibling @ 1280px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = await openSolo(page, "accordion");
  const summaryA = page.getByText("Section A");
  const summaryB = page.getByText("Section B");
  await summaryA.click();
  await page.waitForTimeout(200);
  const itemA = page.locator("details", { has: summaryA });
  const itemB = page.locator("details", { has: summaryB });
  expect(await itemA.getAttribute("open")).not.toBeNull();
  await summaryB.click();
  await page.waitForTimeout(200);
  expect(await itemB.getAttribute("open")).not.toBeNull();
  expect(await itemA.getAttribute("open")).toBeNull();
  expect(consoleErrors).toEqual([]);
});

test("toast: appears inside the viewport @ 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "toast");
  await page.getByRole("button", { name: "Show toast" }).click();
  await page.waitForTimeout(600); // rAF + enter transition
  const toastEl = page.locator("[role='status']", { hasText: "Saved" });
  await expect(toastEl).toBeVisible();
  await expectWithinViewportX(page, toastEl, "toast");
  await page.screenshot({ path: join(shotsDir, "toast-visible-mobile.png") });
  expect(consoleErrors).toEqual([]);
});
