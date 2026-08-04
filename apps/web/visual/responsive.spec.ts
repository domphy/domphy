import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

/**
 * Responsive smoke checks for the built docs site: no horizontal overflow,
 * key landmarks reachable, and the mobile drawer actually opens — at mobile,
 * tablet, desktop and wide viewports. Non-visual (assertions only), with
 * screenshots saved to .ui-qa/responsive/ for the record.
 */

const shotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".ui-qa",
  "responsive",
);
mkdirSync(shotsDir, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-375x667", width: 375, height: 667, mobile: true },
  { name: "tablet-768x1024", width: 768, height: 1024, mobile: true },
  { name: "desktop-1280x800", width: 1280, height: 800, mobile: false },
  { name: "wide-1920x1080", width: 1920, height: 1080, mobile: false },
] as const;

const PAGES = [
  // drawerLink: text of a link that is only reachable once the mobile
  // drawer opens (primary nav on home, docs sidebar on doc pages).
  { name: "home", url: "/", drawerLink: "Playground", hasH1: true },
  {
    name: "quickstart",
    url: "/docs/quickstart/",
    drawerLink: "Why Domphy",
    hasH1: true,
  },
  // layout: page (no docs sidebar) — mobile drawer exposes the primary nav.
  // The page body is only the CodeEditor island, so there is no h1 landmark.
  {
    name: "playground",
    url: "/docs/playground/",
    drawerLink: "Playground",
    hasH1: false,
  },
] as const;

/** No element may push the document wider than the viewport. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const slack = 1; // sub-pixel rounding
    const docOverflow = doc.scrollWidth - doc.clientWidth;
    // Find the worst offending elements for a useful failure message.
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
  for (const target of PAGES) {
    test(`${target.name} @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const consoleErrors: string[] = [];
      page.on("pageerror", (error) =>
        consoleErrors.push(String(error.message).slice(0, 200)),
      );
      await page.goto(target.url, { waitUntil: "domcontentloaded" });
      // Let islands (search, previews) mount.
      await page.waitForTimeout(1500);

      // Key landmarks.
      await expect(page.locator("header").first()).toBeVisible();
      if (target.hasH1) {
        await expect(page.locator("h1").first()).toBeVisible();
      }
      await expect(page.locator("main, [role='main']").first()).toBeAttached();
      // Skip-to-content link exists (visually hidden until focused).
      await expect(
        page.locator("a.dp-skip-link, a[href='#main-content']").first(),
      ).toBeAttached();

      // Mobile: drawer toggle appears and opens the nav; desktop: hidden.
      const toggle = page.locator("[data-menu-toggle]").first();
      if (viewport.mobile) {
        await expect(toggle).toBeVisible();
        await toggle.click();
        await page.waitForTimeout(300);
        const navLink = page
          .locator("header a, nav a, aside a")
          .filter({ hasText: target.drawerLink })
          .first();
        await expect(navLink).toBeVisible();
        await toggle.click();
      } else {
        await expect(toggle).toBeHidden();
      }

      await expectNoHorizontalOverflow(page);

      expect(
        consoleErrors,
        `page errors: ${consoleErrors.join(" | ")}`,
      ).toEqual([]);

      await page.screenshot({
        path: join(shotsDir, `${target.name}-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }
}
