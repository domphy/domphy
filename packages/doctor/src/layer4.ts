/**
 * Layer 4 — HTML + CSS output analysis.
 * Generates HTML/CSS from an ElementNode and runs external linters:
 *   • htmlhint  — structural HTML rules (a11y basics, attribute validity)
 *   • stylelint — CSS quality rules (no named colors, no !important, etc.)
 *
 * Only called from the CLI after Layer 1–3 (diagnose) has already run.
 * Diagnostics produced here have category "output".
 */
import { ElementNode } from "@domphy/core";
import type { Diagnostic } from "./diagnose.js";

// ─── htmlhint rule set ────────────────────────────────────────────────────────

const HTMLHINT_RULES: Record<string, boolean | string | number> = {
  "alt-require": true,
  "attr-no-duplication": true,
  "button-type-require": true,
  "id-unique": true,
  "input-requires-label": true,
  "src-not-empty": true,
  "spec-char-escape": true,
  "tag-no-obsolete": true,
  "tag-pair": true,
  "tagname-lowercase": true,
};

// ─── stylelint rule set ───────────────────────────────────────────────────────

const STYLELINT_CONFIG = {
  rules: {
    "color-named": "never" as const,
    "color-no-invalid-hex": true,
    "declaration-no-important": true,
    "no-duplicate-selectors": true,
    "no-empty-source": null,
    "length-zero-no-unit": true,
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export interface Layer4Options {
  path?: string;
}

/**
 * Runs HTML + CSS linters on the output of a built ElementNode.
 * Returns Diagnostic[] with category "output".
 * Silently returns [] if linter packages are not installed.
 */
export async function auditOutput(
  node: ElementNode,
  options: Layer4Options = {},
): Promise<Diagnostic[]> {
  const path = options.path ?? node.tagName;
  const html = node.generateHTML();
  const css = node.generateCSS();

  const [htmlDiags, cssDiags] = await Promise.all([
    checkHtml(html, path),
    checkCss(css, path),
  ]);

  return [...htmlDiags, ...cssDiags];
}

// ─── HTML via htmlhint ────────────────────────────────────────────────────────

async function checkHtml(html: string, path: string): Promise<Diagnostic[]> {
  if (!html) return [];
  let HTMLHint: { verify: (html: string, rules: Record<string, unknown>) => HintMessage[] };
  try {
    const mod = await import("htmlhint" as string) as { default?: { HTMLHint: typeof HTMLHint }; HTMLHint?: typeof HTMLHint };
    HTMLHint = mod.default?.HTMLHint ?? mod.HTMLHint!;
  } catch {
    return [];
  }

  const messages = HTMLHint.verify(html, HTMLHINT_RULES);
  return messages.map((m) => ({
    rule: `html/${m.rule.id}`,
    severity: m.type === "error" ? ("error" as const) : ("warning" as const),
    category: "output" as any,
    path: `${path} [html:${m.line}:${m.col}]`,
    message: m.message,
    hint: m.rule.link ? `See: ${m.rule.link}` : undefined,
  }));
}

interface HintMessage {
  type: "warning" | "error";
  message: string;
  line: number;
  col: number;
  rule: { id: string; link?: string };
}

// ─── CSS via stylelint ────────────────────────────────────────────────────────

async function checkCss(css: string, path: string): Promise<Diagnostic[]> {
  if (!css) return [];
  let stylelint: { lint: (opts: { code: string; config: typeof STYLELINT_CONFIG }) => Promise<StylelintResult> };
  try {
    const mod = await import("stylelint" as string) as { default: typeof stylelint };
    stylelint = mod.default;
  } catch {
    return [];
  }

  let result: StylelintResult;
  try {
    result = await stylelint.lint({ code: css, config: STYLELINT_CONFIG });
  } catch {
    return [];
  }

  const warnings = result.results?.[0]?.warnings ?? [];
  return warnings.map((w) => ({
    rule: `css/${w.rule}`,
    severity: w.severity === "error" ? ("error" as const) : ("warning" as const),
    category: "output" as any,
    path: `${path} [css:${w.line}:${w.column}]`,
    message: w.text,
    hint: undefined,
  }));
}

interface StylelintResult {
  results: Array<{
    warnings: Array<{
      rule: string;
      severity: "error" | "warning";
      text: string;
      line: number;
      column: number;
    }>;
  }>;
}
