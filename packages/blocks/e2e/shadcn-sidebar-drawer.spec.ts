import { expect, type Page, test } from "@playwright/test";
import { mountBlock, openDemo } from "./helpers.js";

/**
 * Mobile off-canvas drawer contract for the hand-rolled shadcn sidebars
 * (sidebar05-08, sidebar10-12, sidebarLeftRight, sidebarStickyHeader — the
 * variants that do NOT go through @domphy/ui's `drawer()` patch).
 *
 * Truth sources, none of them the code's own output:
 *  - shadcn/ui `SidebarProvider` keeps `open` (desktop, default true) and
 *    `openMobile` (default FALSE) as separate state, so the drawer is closed
 *    on first paint at phone widths.
 *  - WAI-ARIA APG "Dialog (Modal)": Escape dismisses a modal overlay. The
 *    mobile drawer is one (fixed panel + dimming backdrop over the content).
 *  - WCAG 2.4.3 Focus Order, as the BROWSER implements it: a panel moved off
 *    screen with `transform` keeps every link in the tab order; only
 *    `display`/`visibility`/`inert` take it out. Asserted by asking Chromium
 *    for the computed styles rather than by reading our own source.
 */

const DRAWER_BLOCKS = [
  "sidebar05",
  "sidebar06",
  "sidebar07",
  "sidebar08",
  "sidebar10",
  "sidebar11",
  "sidebar12",
  "sidebarLeftRight",
  "sidebarStickyHeader",
] as const;

const MOBILE = { width: 375, height: 800 };

/** Panel offset from the block's left edge, and whether it can take focus. */
async function drawerState(page: Page, name: string) {
  return page.evaluate((blockName) => {
    const box = document.querySelector(
      `[data-block="${blockName}"] .block-box`,
    );
    if (!box) throw new Error(`no block-box for ${blockName}`);
    const aside = box.querySelector("aside");
    if (!aside) throw new Error(`no aside for ${blockName}`);
    const focusableSelector =
      "a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex='0']";
    let tabbable = 0;
    for (const element of aside.querySelectorAll(focusableSelector)) {
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (element.closest("[inert]")) continue;
      tabbable++;
    }
    const boxRect = box.getBoundingClientRect();
    const asideRect = aside.getBoundingClientRect();
    return {
      offsetLeft: Math.round(asideRect.left - boxRect.left),
      width: Math.round(asideRect.width),
      tabbable,
    };
  }, name);
}

async function clickToggle(page: Page, name: string): Promise<void> {
  await page.evaluate((blockName) => {
    const box = document.querySelector(
      `[data-block="${blockName}"] .block-box`,
    );
    const toggle = [...(box?.querySelectorAll("button") ?? [])].find(
      (button) =>
        /toggle sidebar/i.test(button.getAttribute("aria-label") ?? "") &&
        getComputedStyle(button).display !== "none",
    );
    if (!toggle) throw new Error(`no visible sidebar toggle in ${blockName}`);
    toggle.click();
  }, name);
  await page.waitForTimeout(500);
}

test.describe("shadcn mobile drawer", () => {
  test.use({ viewport: MOBILE });

  for (const name of DRAWER_BLOCKS) {
    test(`${name}: closed on first paint, Escape dismisses, no phantom tab stops`, async ({
      page,
    }) => {
      await openDemo(page);
      await mountBlock(page, name);

      // shadcn SidebarProvider: openMobile defaults to false.
      const closed = await drawerState(page, name);
      expect(
        closed.offsetLeft,
        "drawer panel is off screen on first paint",
      ).toBeLessThanOrEqual(-closed.width + 1);
      // WCAG 2.4.3 as Chromium implements it.
      expect(closed.tabbable, "closed drawer holds no tab stops").toBe(0);

      await clickToggle(page, name);
      const open = await drawerState(page, name);
      expect(open.offsetLeft, "toggle slides the panel in").toBe(0);
      expect(
        open.tabbable,
        "open drawer is keyboard reachable",
      ).toBeGreaterThan(0);

      // WAI-ARIA APG dialog pattern.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      const dismissed = await drawerState(page, name);
      expect(
        dismissed.offsetLeft,
        "Escape dismisses the drawer",
      ).toBeLessThanOrEqual(-dismissed.width + 1);
      expect(dismissed.tabbable).toBe(0);
    });
  }
});

test.describe("shadcn desktop sidebar", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("Escape does not collapse the desktop sidebar", async ({ page }) => {
    await openDemo(page);
    await mountBlock(page, "sidebar07");
    const before = await drawerState(page, "sidebar07");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    expect((await drawerState(page, "sidebar07")).width).toBe(before.width);
  });

  test("a sidebar collapsed to zero width leaves the tab order", async ({
    page,
  }) => {
    await openDemo(page);
    await mountBlock(page, "sidebar05");
    expect((await drawerState(page, "sidebar05")).tabbable).toBeGreaterThan(0);
    await clickToggle(page, "sidebar05");
    expect((await drawerState(page, "sidebar05")).tabbable).toBe(0);
  });
});
