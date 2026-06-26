import { checkContrast } from "./contrast.js";
import { detectOverlaps } from "./overlap.js";
import { checkOverlays } from "./overlay.js";
import { snapshot, toSVG } from "./svg.js";
import { checkTheme } from "./theme.js";
import type { AuditIssue, AuditPage, AuditResult } from "./types.js";

/**
 * Extended page interface required for scanInteractive().
 * Compatible with playwright.Page — pass a Playwright page directly.
 */
export interface AuditPageFull extends AuditPage {
  hover(selector: string, options?: { force?: boolean }): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
}

/**
 * Full interactive audit: runs static checks on the initial page, then
 * auto-discovers and activates potential overlay triggers (nav dropdowns,
 * menus, popovers) by hovering them and checking the newly-visible overlays.
 *
 * Usage with Playwright:
 * ```ts
 * import { chromium } from 'playwright';
 * import { scanInteractive } from '@domphy/audit';
 *
 * const browser = await chromium.launch();
 * const page = await browser.newPage();
 * await page.goto('http://localhost:5173');
 * const result = await scanInteractive(page);
 * console.log(result.issues);
 * await browser.close();
 * ```
 */
export async function scanInteractive(
  page: AuditPageFull,
  options: {
    /** ms to wait after hover before checking (default 150) */
    hoverDelay?: number;
    /** Skip interactive scan — only run static checks */
    staticOnly?: boolean;
  } = {},
): Promise<AuditResult> {
  const { hoverDelay = 150, staticOnly = false } = options;

  // --- Static checks on initial page state ---
  const [themeIssues, overlapIssues, contrastIssues, overlayIssues, layout] =
    await Promise.all([
      checkTheme(page),
      detectOverlaps(page),
      checkContrast(page),
      checkOverlays(page),
      snapshot(page),
    ]);

  const issues: AuditIssue[] = [
    ...themeIssues,
    ...overlapIssues,
    ...contrastIssues,
    ...overlayIssues,
  ];

  if (staticOnly) {
    return { ok: issues.length === 0, issues, svg: toSVG(layout, issues) };
  }

  // --- Discover potential overlay triggers ---
  // Stamp each potential trigger with a temp data-audit-trigger attribute,
  // hover it, run overlay checks on the newly-visible overlays, clean up.
  const triggerCount = await page.evaluate(() => {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>("*"),
    ).filter((el) => {
      // Skip invisible or zero-size elements
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden")
        return false;

      // Has at least one absolutely-positioned, display:none child — likely a dropdown/overlay trigger
      return Array.from(el.children).some((child) => {
        const cs = getComputedStyle(child);
        return (
          (cs.position === "absolute" || cs.position === "fixed") &&
          cs.display === "none"
        );
      });
    });

    for (let i = 0; i < triggers.length; i++) {
      triggers[i].setAttribute("data-audit-trigger", String(i));
    }
    return triggers.length;
  });

  for (let i = 0; i < triggerCount; i++) {
    try {
      await page.hover(`[data-audit-trigger="${i}"]`, { force: true });
      await page.waitForTimeout(hoverDelay);
      const afterHover = await checkOverlays(page);
      issues.push(...afterHover);
    } catch {
      // Element may have been removed or become invisible — skip
    }
  }

  // Clean up temp attributes
  await page.evaluate(() => {
    document
      .querySelectorAll("[data-audit-trigger]")
      .forEach((el) => el.removeAttribute("data-audit-trigger"));
  });

  const unique = dedup(issues);
  return {
    ok: unique.length === 0,
    issues: unique,
    svg: toSVG(layout, unique),
  };
}

function dedup(issues: AuditIssue[]): AuditIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.type}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
