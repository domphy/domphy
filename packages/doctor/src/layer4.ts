/**
 * Layer 4 — HTML + CSS output analysis.
 * Generates HTML/CSS from an ElementNode and runs external linters:
 *   • htmlhint  — structural HTML rules (a11y basics, attribute validity)
 *   • stylelint — CSS quality rules (no named colors, no !important, etc.)
 *
 * Only called from the CLI after Layer 1–3 (diagnose) has already run.
 * Diagnostics produced here have category "output".
 */
import { type ElementNode, HIDDEN_DISPLAY_NONE_CSS } from "@domphy/core";
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
    // color-named intentionally omitted — Layer 2 raw-theme-value already catches literal colors
    // at the source level with better context (which property, which element).
    "color-no-invalid-hex": true,
    "declaration-no-important": true,
    "no-duplicate-selectors": true,
    "no-empty-source": null,
    "length-zero-no-unit": true,
  },
};

// The base rule `ElementNode.generateCSS()` prepends to every ROOT node's
// stylesheet (packages/core/src/classes/ElementNode.ts). It is framework-owned,
// byte-for-byte fixed, and its `!important` is load-bearing: the UA's
// `[hidden] { display: none }` loses to any author declaration, and inside the
// author sheet `[hidden]` ties the per-node class on specificity while coming
// first, so only an important declaration keeps a `hidden` element hidden.
// Bootstrap 5's Reboot ships the identical rule. Nothing the user wrote can
// change it, so a `declaration-no-important` warning on it is unactionable
// noise on EVERY audited tree — and suppressing the rule wholesale would hide
// the user's own `!important`, which is exactly what Layer 4 is there to catch.
// Only this prefix is exempted; user CSS is linted unchanged. Imported from
// @domphy/core (not re-typed here) so a change to the real rule text changes
// this exemption automatically instead of silently reintroducing the warning.
const FRAMEWORK_BASE_CSS = HIDDEN_DISPLAY_NONE_CSS;

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
  type HtmlHintInstance = {
    verify: (html: string, rules: Record<string, unknown>) => HintMessage[];
  };
  let htmlhint: HtmlHintInstance | null = null;
  try {
    type HtmlHintMod = {
      default?: { HTMLHint?: HtmlHintInstance };
      HTMLHint?: HtmlHintInstance;
    };
    const mod = (await import("htmlhint" as string)) as HtmlHintMod;
    htmlhint = mod.default?.HTMLHint ?? mod.HTMLHint ?? null;
  } catch {
    return [];
  }
  if (!htmlhint) return [];

  // Scoped to this call: two audits (even concurrent ones, via
  // `auditOutput`'s own `Promise.all`) must not share search-cursor state.
  let inputLabelSearchCursor = 0;
  const messages = htmlhint.verify(html, HTMLHINT_RULES).filter((m) => {
    if (m.rule.id !== "input-requires-label") return true;
    const raw = m.raw ?? "";
    if (raw && rawHasAccessibleNameAttr(raw)) return false;
    if (!raw) return true;
    // Messages arrive in document order (same order htmlhint's `tagstart`
    // listener saw them), so a cursor that only advances forward correctly
    // matches repeated identical `raw` text to its own occurrence.
    const index = html.indexOf(raw, inputLabelSearchCursor);
    if (index === -1) return true;
    inputLabelSearchCursor = index + raw.length;
    return !isInsideLabelTag(html, index);
  });
  return messages.map((m) => ({
    rule: `html/${m.rule.id}`,
    severity: m.type === "error" ? ("error" as const) : ("warning" as const),
    category: "output",
    path: `${path} [html:${m.line}:${m.col}]`,
    message: m.message,
    hint: m.rule.link ? `See: ${m.rule.link}` : undefined,
  }));
}

interface HintMessage {
  type: "warning" | "error";
  message: string;
  raw: string;
  line: number;
  col: number;
  rule: { id: string; link?: string };
}

// htmlhint's `input-requires-label` (packages/doctor/node_modules/htmlhint/dist/core/rules/input-requires-label.js)
// only recognizes one accessible-name source: a `<label for="…">` matching the
// input's `id`. WCAG 4.1.2 / the HTML accessible-name-computation algorithm
// recognizes several more — aria-label, aria-labelledby, title, and a `<label>`
// that wraps the input implicitly (no `for` needed) — and the vendored rule has
// no branch for any of them, so every input using one of those still gets
// flagged. Post-filter its hits here instead of patching the vendored linter:
// keep the diagnostic only when the input truly has no accessible name.
const ACCESSIBLE_NAME_ATTR =
  /\b(?:aria-label|aria-labelledby|title)\s*=\s*(["'])(.*?)\1/i;

function rawHasAccessibleNameAttr(raw: string): boolean {
  const match = raw.match(ACCESSIBLE_NAME_ATTR);
  return match !== null && match[2].trim().length > 0;
}

// Labels never nest in valid HTML, so a simple open/close tally up to the
// input's own position tells us whether it sits inside an unclosed <label>.
function isInsideLabelTag(html: string, tagIndex: number): boolean {
  const before = html.slice(0, tagIndex);
  const opens = before.match(/<label\b/gi)?.length ?? 0;
  const closes = before.match(/<\/label\s*>/gi)?.length ?? 0;
  return opens > closes;
}

// ─── CSS via stylelint ────────────────────────────────────────────────────────

async function checkCss(rawCss: string, path: string): Promise<Diagnostic[]> {
  // Blank out the framework base rule rather than slicing it off, so every
  // line/column stylelint reports still points at the same offset in the CSS
  // the caller can actually see.
  const css = rawCss.startsWith(FRAMEWORK_BASE_CSS)
    ? " ".repeat(FRAMEWORK_BASE_CSS.length) +
      rawCss.slice(FRAMEWORK_BASE_CSS.length)
    : rawCss;
  if (!css.trim()) return [];
  let stylelint: {
    lint: (opts: {
      code: string;
      config: typeof STYLELINT_CONFIG;
    }) => Promise<StylelintResult>;
  };
  try {
    const mod = (await import("stylelint" as string)) as {
      default: typeof stylelint;
    };
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
    severity:
      w.severity === "error" ? ("error" as const) : ("warning" as const),
    category: "output",
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
