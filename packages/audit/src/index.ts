// @domphy/audit — baseline-free layout verification for Domphy UIs via Playwright,
// plus static a11y checks for Domphy element trees (no browser required).
//
// Playwright-based checks (require a live page):
//   checkTheme, detectOverlaps, verifyGeometry, checkContrast, checkOverlays
//   checkLayout (aggregator), scanInteractive (interactive with hover discovery)
//
// Static element-tree checks (zero-dep, works in Node / at build time):
//   auditA11y — missing-alt, missing-label, heading-hierarchy, missing-lang

// Static a11y — element-tree rules (no Playwright)
export { auditA11y } from "./a11y.js";
export type { A11yIssue, A11yResult, A11yRule } from "./a11y.js";

// Playwright-based runtime checks
export { checkContrast } from "./contrast.js";
export type { AuditPageFull } from "./discover.js";
export { scanInteractive } from "./discover.js";
export { verifyGeometry } from "./geometry.js";
export { detectOverlaps } from "./overlap.js";
export { checkOverlays } from "./overlay.js";
export type { LayoutSnapshot } from "./svg.js";
export { snapshot, toSVG } from "./svg.js";
export { checkTheme } from "./theme.js";
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
import { checkOverlays } from "./overlay.js";
import { snapshot, toSVG } from "./svg.js";
import { checkTheme } from "./theme.js";
import type { AuditOptions, AuditPage, AuditResult } from "./types.js";

export async function checkLayout(
  page: AuditPage,
  options: AuditOptions = {},
): Promise<AuditResult> {
  const checks = options.checks ?? [
    "theme",
    "overlap",
    "geometry",
    "contrast",
    "overlay",
  ];

  const [
    themeIssues,
    overlapIssues,
    geometryIssues,
    contrastIssues,
    overlayIssues,
    layout,
  ] = await Promise.all([
    checks.includes("theme") ? checkTheme(page) : Promise.resolve([]),
    checks.includes("overlap") ? detectOverlaps(page) : Promise.resolve([]),
    checks.includes("geometry")
      ? verifyGeometry(page, options.tolerance ?? 1)
      : Promise.resolve([]),
    checks.includes("contrast")
      ? checkContrast(page, options.minContrast ?? 4.5)
      : Promise.resolve([]),
    checks.includes("overlay") ? checkOverlays(page) : Promise.resolve([]),
    snapshot(page),
  ]);

  const issues = [
    ...themeIssues,
    ...overlapIssues,
    ...geometryIssues,
    ...contrastIssues,
    ...overlayIssues,
  ];
  return { ok: issues.length === 0, issues, svg: toSVG(layout, issues) };
}
