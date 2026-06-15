import { HtmlTags, SvgTags, VoidTags } from "@domphy/core";

export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  /** Rule id, e.g. "inline-typography". */
  rule: string;
  severity: Severity;
  /** Human path to the offending node, e.g. "div > ul > li". */
  path: string;
  message: string;
  /** How to fix it. */
  hint?: string;
}

export interface DiagnoseOptions {
  /**
   * Invoke reactive content functions `(listener) => …` with a no-op listener to
   * analyze their output (catches missing `_key` in dynamic lists). Default true.
   * Set false if your reactive functions have side effects.
   */
  runReactive?: boolean;
}

const TAGS = new Set<string>([...HtmlTags, ...SvgTags]);
const VOID = new Set<string>(VoidTags);
const RESERVED = new Set([
  "$",
  "style",
  "_key",
  "_portal",
  "_context",
  "_metadata",
]);
// Inline these and the theme stops owning type scale / rhythm — use patches.
const TYPOGRAPHY_STYLE = new Set([
  "fontSize",
  "lineHeight",
  "fontWeight",
  "letterSpacing",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findTag(element: Record<string, unknown>): string | undefined {
  for (const key in element) {
    if (TAGS.has(key)) return key;
  }
  return undefined;
}

/** Statically analyzes a Domphy element tree and returns idiomatic-usage diagnostics. */
export function diagnose(
  root: unknown,
  options: DiagnoseOptions = {},
): Diagnostic[] {
  const out: Diagnostic[] = [];
  walk(root, "", out, false, options.runReactive !== false);
  return out;
}

function walk(
  node: unknown,
  path: string,
  out: Diagnostic[],
  dynamic: boolean,
  runReactive: boolean,
): void {
  if (typeof node === "function") {
    if (!runReactive) return;
    let result: unknown;
    try {
      result = (node as (listener: unknown) => unknown)(() => {});
    } catch {
      return; // reactive fn threw without a real runtime — skip
    }
    walk(result, path, out, true, runReactive);
    return;
  }

  if (Array.isArray(node)) {
    const elementItems = node.filter(
      (child) => isPlainObject(child) && findTag(child),
    ) as Record<string, unknown>[];

    if (dynamic) {
      if (
        elementItems.length > 1 &&
        elementItems.some((item) => item._key === undefined)
      ) {
        out.push({
          rule: "missing-key",
          severity: "warning",
          path: path || "(list)",
          message:
            "Dynamic list child without `_key` — reordered/keyed lists need a stable `_key` for correct reconcile.",
          hint: "Add `_key: <stable id>` to each item produced by the reactive function.",
        });
      }

      // unstable-key (heuristic): in a dynamic list every `_key` equals its
      // sibling position (0, 1, 2, …). That is the runtime footprint of
      // `items.map((item, i) => ({ …, _key: i }))` — an array-index key, which
      // defeats the point of keying because keys shift when the list reorders.
      if (
        elementItems.length > 1 &&
        elementItems.every((item, index) => item._key === index)
      ) {
        out.push({
          rule: "unstable-key",
          severity: "warning",
          path: path || "(list)",
          message:
            "Dynamic list `_key` values are the array index (0, 1, 2, …) — index keys are unstable across reorders/inserts.",
          hint: "Key by a stable identity from the data (e.g. `_key: item.id`), not the loop index.",
        });
      }
    }

    // duplicate-key: two siblings sharing the same `_key` value break reconcile
    // (the reconciler cannot tell them apart). Decidable on any sibling array,
    // static or dynamic.
    const seenKeys = new Map<string, number>();
    for (const item of elementItems) {
      const key = item._key;
      if (key === undefined || key === null) continue;
      const literalKey = `${typeof key}:${String(key)}`;
      seenKeys.set(literalKey, (seenKeys.get(literalKey) ?? 0) + 1);
    }
    for (const [literalKey, count] of seenKeys) {
      if (count > 1) {
        const value = literalKey.slice(literalKey.indexOf(":") + 1);
        out.push({
          rule: "duplicate-key",
          severity: "error",
          path: path || "(list)",
          message: `Duplicate \`_key\` "${value}" among ${count} siblings — keys must be unique within a list.`,
          hint: "Give each sibling a distinct stable `_key` (e.g. a record id, not a constant).",
        });
      }
    }

    node.forEach((child, index) => {
      walk(child, `${path}[${index}]`, out, false, runReactive);
    });
    return;
  }

  if (!isPlainObject(node)) return;

  const element = node;
  const tag = findTag(element);
  const here = tag ? (path ? `${path} > ${tag}` : tag) : path || "(root)";

  if (!tag) {
    const contentKeys = Object.keys(element).filter(
      (key) =>
        !RESERVED.has(key) &&
        !key.startsWith("_on") &&
        !key.startsWith("on") &&
        !key.startsWith("data") &&
        !key.startsWith("aria"),
    );
    if (contentKeys.length === 1) {
      out.push({
        rule: "unknown-tag",
        severity: "warning",
        path: here,
        message: `"${contentKeys[0]}" is not a known HTML/SVG tag — likely a typo.`,
        hint: "An element's first key must be a valid tag (div, button, span, …).",
      });
    }
    return;
  }

  const content = element[tag];

  if (VOID.has(tag) && content !== null && content !== undefined) {
    out.push({
      rule: "void-content",
      severity: "error",
      path: here,
      message: `Void tag "${tag}" must have null content (got ${Array.isArray(content) ? "array" : typeof content}).`,
      hint: `Write { ${tag}: null, … } and put attributes as sibling keys.`,
    });
  }

  if (isPlainObject(element.style)) {
    const style = element.style;
    for (const prop in style) {
      if (TYPOGRAPHY_STYLE.has(prop) && typeof style[prop] !== "function") {
        out.push({
          rule: "inline-typography",
          severity: "warning",
          path: here,
          message: `Inline \`${prop}\` — avoid inline typography styles.`,
          hint: "Use a typography patch (paragraph()/heading()/small()/strong()/…) via $ so the theme owns the type scale.",
        });
      }
    }
  }

  walk(content, here, out, false, runReactive);
}

/** Issue counts by severity, plus the grand total. */
export interface ValidationSummary {
  error: number;
  warning: number;
  info: number;
  total: number;
}

/** Structured result of {@link validate}: pass/fail flag, issues, and counts. */
export interface ValidationReport {
  /** True when there are no `error`-severity diagnostics. */
  ok: boolean;
  /** Every diagnostic found, across all rules (alias of `diagnose` output). */
  issues: Diagnostic[];
  summary: ValidationSummary;
}

/**
 * Runs every diagnose rule and returns a structured report (pass/fail flag,
 * the issue list, and counts by severity). `ok` is false when any `error`
 * diagnostic is present; warnings/info do not flip `ok`. Use this as the single
 * programmatic entry point; `diagnose`/`format` remain available for raw access.
 */
export function validate(
  root: unknown,
  options: DiagnoseOptions = {},
): ValidationReport {
  const issues = diagnose(root, options);
  const summary: ValidationSummary = {
    error: 0,
    warning: 0,
    info: 0,
    total: issues.length,
  };
  for (const issue of issues) summary[issue.severity] += 1;
  return { ok: summary.error === 0, issues, summary };
}

/** Formats diagnostics as a readable report (one line per issue). */
export function format(diagnostics: Diagnostic[]): string {
  if (diagnostics.length === 0) return "✓ No issues found.";
  const icon = (s: Severity) =>
    s === "error" ? "✗" : s === "warning" ? "⚠" : "i";
  return diagnostics
    .map(
      (d) =>
        `${icon(d.severity)} [${d.rule}] ${d.path}\n  ${d.message}${d.hint ? `\n  → ${d.hint}` : ""}`,
    )
    .join("\n");
}
