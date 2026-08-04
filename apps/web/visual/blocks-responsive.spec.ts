import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

/**
 * Responsive smoke checks for a representative set of @domphy/blocks demos,
 * mounted SOLO via the standalone catalog's `fit=1` mode (no min-width stage
 * clamps — the block's own responsive behavior is what gets measured):
 *
 *   pnpm --filter domphy-web visual:blocks-responsive
 *
 * Coverage per block × viewport: zero page errors, no horizontal overflow
 * (with offender dump), screenshot to .ui-qa/blocks/. Interactive blocks get
 * dedicated behavior tests (sidebar off-canvas/collapse, dashboard filter),
 * plus a dark-mode follow check.
 */

const shotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".ui-qa",
  "blocks",
);
mkdirSync(shotsDir, { recursive: true });

// Full-sweep mode (`BLOCKS_SWEEP=1 pnpm visual:blocks-responsive`): every
// registered block demo at mobile width only, no screenshots — a regression
// net for "some block still forces N columns / fixed width on a 375px
// screen". The curated list below stays the default CI gate.
const SWEEP = process.env.BLOCKS_SWEEP === "1";

function allBlockNames(): string[] {
  const importMap = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "docs",
    "demos",
    "visual",
    "blocks-import-map.ts",
  );
  const source = readFileSync(importMap, "utf8");
  return [...source.matchAll(/^\s{2}(\w+):\s*\(\)\s*=>\s*import/gm)].map(
    (match) => match[1],
  );
}

const VIEWPORTS = SWEEP
  ? ([
      { name: "mobile-375x667", width: 375, height: 667, mobile: true },
    ] as const)
  : ([
      { name: "mobile-375x667", width: 375, height: 667, mobile: true },
      { name: "tablet-768x1024", width: 768, height: 1024, mobile: true },
      { name: "desktop-1280x800", width: 1280, height: 800, mobile: false },
      { name: "wide-1920x1080", width: 1920, height: 1080, mobile: false },
    ] as const);

const BLOCKS: readonly string[] = SWEEP
  ? allBlockNames()
  : [
      "sidebar07",
      "dashboard01",
      "Login01",
      "marquee",
      "bentoGrid",
      "chartAreaDefault",
      // Responsive regression coverage for blocks that used to keep fixed
      // multi-column grids / fixed pixel widths on narrow screens.
      "signup03",
      "signup04",
      "sidebar01",
      "sidebar05",
      "blurFade",
      "android",
      "chartPieLegend",
    ];

function soloUrl(block: string, theme: "light" | "dark" = "light"): string {
  return `/?catalog=blocks&only=${block}&fit=1&theme=${theme}`;
}

async function openSolo(
  page: Page,
  block: string,
  theme: "light" | "dark" = "light",
): Promise<string[]> {
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) =>
    consoleErrors.push(String(error.message).slice(0, 200)),
  );
  await page.goto(soloUrl(block, theme), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-visual-ready='1']", { timeout: 60_000 });
  // Let charts lay out and enter animations settle.
  await page.waitForTimeout(1200);
  return consoleErrors;
}

/** No element may push the document wider than the viewport. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const slack = 1; // sub-pixel rounding
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

for (const viewport of VIEWPORTS) {
  for (const block of BLOCKS) {
    test(`${block} @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const consoleErrors = await openSolo(page, block);

      await expect(
        page.locator(`[data-visual='block-${block}']`),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      expect(
        consoleErrors,
        `page errors: ${consoleErrors.join(" | ")}`,
      ).toEqual([]);

      if (!SWEEP) {
        await page.screenshot({
          path: join(shotsDir, `${block}-${viewport.name}.png`),
          fullPage: true,
        });
      }
    });
  }
}

test("sidebar07: off-canvas drawer opens via header toggle @ 375px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "sidebar07");
  const aside = page.locator("aside").first();

  // Mobile: the aside is the off-canvas drawer, parked beyond the left edge.
  const parkedRight = await aside.evaluate(
    (el) => el.getBoundingClientRect().right,
  );
  expect(parkedRight).toBeLessThanOrEqual(1);

  const toggle = page
    .locator("header button[aria-label*='sidebar' i], header button")
    .first();
  await toggle.click();
  await page.waitForTimeout(400); // transform transition
  const openRight = await aside.evaluate(
    (el) => el.getBoundingClientRect().right,
  );
  expect(openRight).toBeGreaterThan(200);
  // The mobile drawer shows the EXPANDED sidebar (labels + groups), not the
  // desktop icon rail — upstream's mobile Sheet ignores the collapse state.
  await expect(aside.getByText("Playground")).toBeVisible();
  await expect(aside.getByText("Design Engineering")).toBeVisible();
  expect(consoleErrors).toEqual([]);
  await page.screenshot({
    path: join(shotsDir, "sidebar07-mobile-drawer-open.png"),
  });
});

test("sidebar07: desktop collapse shrinks the aside to the icon rail @ 1280px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = await openSolo(page, "sidebar07");
  const aside = page.locator("aside").first();
  const expandedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  expect(expandedWidth).toBeGreaterThan(200);

  const toggle = page
    .locator("header button[aria-label*='sidebar' i], header button")
    .first();
  await toggle.click();
  await page.waitForTimeout(400); // width transition
  const collapsedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  expect(collapsedWidth).toBeLessThan(expandedWidth / 2);
  // Content re-flows: the main region stays in view, no overflow.
  await expectNoHorizontalOverflow(page);
  expect(consoleErrors).toEqual([]);
  await page.screenshot({
    path: join(shotsDir, "sidebar07-desktop-collapsed.png"),
  });
});

test("sidebar07: Ctrl+B hotkey collapses the sidebar @ 1280px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openSolo(page, "sidebar07");
  const aside = page.locator("aside").first();
  const expandedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  await page.keyboard.press("Control+b");
  await page.waitForTimeout(400);
  const collapsedWidth = await aside.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  expect(collapsedWidth).toBeLessThan(expandedWidth / 2);
});

test("dashboard01: status filter narrows the table via the mobile select @ 375px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "dashboard01");
  // Upstream swaps the desktop tab list for a select under 40em.
  const viewSelect = page.locator('select[aria-label="Select view"]');
  await expect(viewSelect).toBeVisible();
  await viewSelect.selectOption("Done");
  await page.waitForTimeout(400);
  await expect(page.locator("text=Budget Forecast").first()).toBeVisible();
  await expect(page.locator("text=Risk Assessment")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("dashboard01: status filter narrows the table via the desktop tabs @ 1280px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = await openSolo(page, "dashboard01");
  // The select is hidden at ≥40em; the tab list is the desktop control.
  await expect(page.locator('select[aria-label="Select view"]')).toBeHidden();
  await page.getByRole("tab", { name: "Done" }).click();
  await page.waitForTimeout(400);
  await expect(page.locator("text=Budget Forecast").first()).toBeVisible();
  await expect(page.locator("text=Risk Assessment")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("Login01: form fields usable @ 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const consoleErrors = await openSolo(page, "Login01");
  const email = page.locator('input[type="email"]').first();
  const password = page.locator('input[type="password"]').first();
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await email.fill("audit@example.com");
  await password.fill("hunter2");
  await expect(email).toHaveValue("audit@example.com");
  await expectNoHorizontalOverflow(page);
  expect(consoleErrors).toEqual([]);
});

test("Login01: dark mode follows [data-theme] @ 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openSolo(page, "Login01", "dark");
  const luminance = await page.evaluate(() => {
    const probe = document.querySelector("[data-visual-page]") ?? document.body;
    const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(
      getComputedStyle(probe as Element).backgroundColor,
    );
    if (!match) return 1;
    const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });
  expect(luminance, `dark-theme surface luminance ${luminance}`).toBeLessThan(
    0.35,
  );
  await page.screenshot({
    path: join(shotsDir, "Login01-dark-desktop.png"),
    fullPage: true,
  });
});
