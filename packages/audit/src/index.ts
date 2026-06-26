// @domphy/audit — baseline-free layout verification for Domphy UIs via Playwright.
// Detects overlap (sibling elements intersecting), geometry violations (Domphy
// button height formula), and color contrast failures — without any screenshot
// baseline. Uses getBoundingClientRect() + getComputedStyle() in the browser.

export { checkContrast } from "./contrast.js";
export { verifyGeometry } from "./geometry.js";
export { detectOverlaps } from "./overlap.js";
export type { LayoutSnapshot } from "./svg.js";
export { snapshot, toSVG } from "./svg.js";
export type {
  AuditIssue,
  AuditOptions,
  AuditPage,
  AuditResult,
  Rect,
} from "./types.js";

import { checkContrast } from "./contrast.js";
import { verifyGeometry } from "./geometry.js";
import { detectOverlaps } from "./overlap.js";
import { snapshot, toSVG } from "./svg.js";
import type { AuditOptions, AuditPage, AuditResult } from "./types.js";

export async function checkLayout(
  page: AuditPage,
  options: AuditOptions = {},
): Promise<AuditResult> {
  const checks = options.checks ?? ["overlap", "geometry", "contrast"];

  const [overlapIssues, geometryIssues, contrastIssues, layout] =
    await Promise.all([
      checks.includes("overlap") ? detectOverlaps(page) : Promise.resolve([]),
      checks.includes("geometry")
        ? verifyGeometry(page, options.tolerance ?? 1)
        : Promise.resolve([]),
      checks.includes("contrast")
        ? checkContrast(page, options.minContrast ?? 4.5)
        : Promise.resolve([]),
      snapshot(page),
    ]);

  const issues = [...overlapIssues, ...geometryIssues, ...contrastIssues];
  return { ok: issues.length === 0, issues, svg: toSVG(layout, issues) };
}
