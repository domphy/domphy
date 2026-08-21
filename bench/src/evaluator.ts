import { diagnose, format, validate } from "@domphy/doctor";
import { transformSync } from "esbuild";
import type { Task } from "./tasks.js";

export interface EvalResult {
  taskId: string;
  condition: Condition;
  /** Raw code extracted from the LLM response. */
  code: string;
  /** esbuild transform succeeded (valid TypeScript syntax). */
  compiles: boolean;
  /** No inline typography style properties detected. */
  noTypographyViolations: boolean;
  /** Required tags/keywords present (task-specific heuristic). */
  hasRequiredStructure: boolean;
  /** Detected anti-pattern labels. */
  issues: string[];
  /** 0–100. Condition C cannot reach a passing score without structure. */
  score: number;
  durationMs: number;
  /** Condition C only: how many LLM rounds were needed. */
  iterations?: number;
}

export type Condition = "A" | "B" | "C" | "D";

/** Score at or above this is a pass — C is capped below this when structure fails. */
export const PASS_SCORE = 70;

/** C cannot pass without required structure; compile+typo alone max out here. */
const C_WITHOUT_STRUCTURE_CAP = 60;

// ─── Code extraction ────────────────────────────────────────────────────────

/** Pull the first TypeScript/JavaScript code block from an LLM reply. */
export function extractCode(reply: string): string {
  const fenced = reply.match(
    /```(?:ts|tsx|typescript|js|javascript)?\n([\s\S]*?)```/,
  );
  if (fenced) return fenced[1].trim();
  // Fallback: if no fences, treat whole reply as code.
  return reply.trim();
}

// ─── Compile check ──────────────────────────────────────────────────────────

async function checkCompiles(
  code: string,
  condition: Condition,
): Promise<boolean> {
  return checkCompilesSync(code, condition);
}

function checkCompilesSync(code: string, condition: Condition): boolean {
  const loader = condition === "D" ? "tsx" : "ts";
  try {
    transformSync(code, {
      loader,
      target: "esnext",
      format: "esm",
      // transform() doesn't resolve imports — pure syntax/type-strip check.
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Evaluate generated source into a Domphy tree (for doctor) ──────────────

function stubExport(name: string): unknown {
  if (name === "toState") {
    return (value: unknown) => ({
      get: () => value,
      set: (next: unknown) => {
        value = next;
      },
    });
  }
  if (name === "computed") {
    return (fn: (listener?: unknown) => unknown) => ({
      get: (listener?: unknown) => fn(listener),
    });
  }
  if (name === "effect" || name === "effectScope" || name === "untrack") {
    return (fn: (listener?: unknown) => unknown) => fn();
  }
  if (name === "batch" || name === "flushSync") {
    return (fn: () => unknown) => fn();
  }
  if (name === "RecordState") {
    return class RecordState {
      data: Record<string, unknown>;
      constructor(init: Record<string, unknown> = {}) {
        this.data = { ...init };
      }
      get(_listener?: unknown, key?: string) {
        return key === undefined ? this.data : this.data[key];
      }
      set(key: string, value: unknown) {
        this.data[key] = value;
      }
    };
  }
  if (name === "themeColor" || name === "themeColorToken") {
    return () => "var(--neutral-9)";
  }
  if (name === "themeSpacing") {
    return (n: number) => `calc(${n / 4}em)`;
  }
  if (name === "themeSize") {
    return () => "1em";
  }
  if (name === "themeDensity") {
    return () => 1.5;
  }
  if (name === "themeFluidSpacing") {
    return (min: number) => `calc(${min / 4}em)`;
  }
  if (name === "createForm") {
    return () => ({
      Field: () => ({}),
      handleSubmit: () => {},
      state: { meta: { errors: [] } },
    });
  }
  return (..._args: unknown[]) => ({});
}

function stubRequire(_id: string): Record<string, unknown> {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "__esModule") return true;
        if (typeof prop !== "string") return undefined;
        return stubExport(prop);
      },
    },
  );
}

function isElementLike(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value as object).some(
    (key) =>
      key !== "style" &&
      key !== "default" &&
      key !== "$" &&
      /^[a-z][a-z0-9]*$/.test(key),
  );
}

function unwrapExport(exported: unknown): unknown | null {
  if (exported == null || typeof exported !== "object") return null;
  const record = exported as Record<string, unknown>;
  if (isElementLike(record)) return record;
  if (isElementLike(record.default)) return record.default;
  for (const key of ["app", "App", "element", "tree", "root"]) {
    if (isElementLike(record[key])) return record[key];
  }
  return record.default ?? null;
}

/**
 * Evaluate generated TypeScript into a Domphy element tree so doctor can
 * walk it. @domphy/* imports are stubbed — we only need the object shape.
 */
export function extractTree(code: string): unknown | null {
  if (!code.trim()) return null;
  try {
    const { code: js } = transformSync(code, {
      loader: "ts",
      target: "esnext",
      format: "cjs",
    });
    const module = { exports: {} as Record<string, unknown> };
    const fn = new Function(
      "require",
      "module",
      "exports",
      `${js}
;
var __exported = module.exports && (module.exports.default !== undefined
  ? module.exports.default
  : module.exports);
if (__exported && typeof __exported === "object" && Object.keys(__exported).length) return __exported;
if (typeof App !== "undefined") return App;
if (typeof app !== "undefined") return app;
if (typeof element !== "undefined") return element;
if (typeof tree !== "undefined") return tree;
return __exported;
`,
    );
    return unwrapExport(fn(stubRequire, module, module.exports));
  } catch {
    return null;
  }
}

// ─── Static analysis ────────────────────────────────────────────────────────

// True typography violations: inline style properties for TEXT that Domphy
// requires you to use patches (heading/paragraph/small/link/etc.) for.
// Layout-only properties (margin, padding, gap, display, flex…) are allowed
// as inline style because Domphy has no layout patch for them.
const TYPOGRAPHY_PATTERNS: RegExp[] = [
  /fontSize\s*:\s*["'`\d]/, // fontSize: "16px" — use heading()/paragraph()/small()
  /\bcolor\s*:\s*["'`#](?!Variant|ariant)/, // color: "#333"    — use themeColor() or patch
  /lineHeight\s*:\s*["'`\d]/, // lineHeight: 1.5   — use paragraph()/heading()
  /fontWeight\s*:\s*["'`\d]/, // fontWeight: 700   — use strong()/heading()
  /fontFamily\s*:\s*["'`]/, // fontFamily: "..."  — use theme
  /letterSpacing\s*:\s*["'`\d]/, // letterSpacing: ...— use patch
];

const REMOVED_API_PATTERNS: RegExp[] = [
  /\bFormState\b/,
  /\bFieldState\b/,
  /\bfrom ['"]@domphy\/ui['"].*\bform\b/,
  /\bfrom ['"]@domphy\/ui['"].*\bfield\b/,
];

function detectTypographyViolations(code: string): string[] {
  return TYPOGRAPHY_PATTERNS.filter((p) => p.test(code)).map(
    (p) =>
      `inline-typography(${p.source.replace(/\\.*/g, "").substring(0, 20)})`,
  );
}

function detectRemovedApi(code: string): string[] {
  return REMOVED_API_PATTERNS.filter((p) => p.test(code)).map(
    () => "removed-api",
  );
}

function checkStructure(
  code: string,
  task: Task,
  condition: Condition,
): boolean {
  if (condition === "D") {
    // React baseline: check for JSX tags and React hooks
    const tags = task.requiredTags ?? [];
    const jsxOk =
      tags.length === 0 ||
      tags.some((tag) => {
        // Convert "button:" → "<button" and "div:" → "<div" for JSX check
        const jsxTag = `<${tag.replace(":", "")}`;
        return code.includes(jsxTag) || code.includes(tag);
      });
    const hasReact =
      code.includes("useState") ||
      code.includes("useReducer") ||
      code.includes("function ") ||
      code.includes("const ") ||
      code.includes("=>") ||
      code.includes("export default");
    return jsxOk && hasReact;
  }

  const tags = task.requiredTags ?? [];
  const keywords = task.requiredKeywords ?? [];

  // For Domphy: needs at least one required tag AND at least one required keyword
  const tagsOk = tags.length === 0 || tags.some((tag) => code.includes(tag));
  // Keywords must ALL appear (every required patch/API must be present)
  const keywordsOk =
    keywords.length === 0 || keywords.every((kw) => code.includes(kw));

  return tagsOk && keywordsOk;
}

function missingKeywords(code: string, task: Task): string[] {
  return (task.requiredKeywords ?? []).filter((kw) => !code.includes(kw));
}

function missingTags(code: string, task: Task): string[] {
  const tags = task.requiredTags ?? [];
  if (tags.length === 0) return [];
  return tags.every((tag) => !code.includes(tag)) ? tags : [];
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export function computeScore(
  compiles: boolean,
  noTypo: boolean,
  structure: boolean,
  condition: Condition,
): number {
  if (condition === "D") {
    // React baseline: compile + structure (no typography rule)
    return (compiles ? 50 : 0) + (structure ? 50 : 0);
  }
  const score = (compiles ? 40 : 0) + (noTypo ? 30 : 0) + (structure ? 30 : 0);
  // C cannot pass on syntax+typography alone — required structure is a gate.
  if (condition === "C" && !structure) {
    return Math.min(score, C_WITHOUT_STRUCTURE_CAP);
  }
  return score;
}

// ─── Main evaluation entry ───────────────────────────────────────────────────

export async function evaluate(
  reply: string,
  task: Task,
  condition: Condition,
  durationMs: number,
  iterations?: number,
): Promise<EvalResult> {
  const code = extractCode(reply);

  const compiles = await checkCompiles(code, condition);

  const typoIssues = condition === "D" ? [] : detectTypographyViolations(code);
  const removedApiIssues = condition === "D" ? [] : detectRemovedApi(code);
  const hasRequiredStructure = checkStructure(code, task, condition);

  const doctorIssues = condition === "D" ? [] : collectDoctorIssues(code);

  const noTypographyViolations =
    typoIssues.length === 0 &&
    !doctorIssues.some((issue) => issue.startsWith("inline-typography"));

  const issues = [...typoIssues, ...removedApiIssues, ...doctorIssues];

  const score = computeScore(
    compiles,
    noTypographyViolations,
    hasRequiredStructure,
    condition,
  );

  return {
    taskId: task.id,
    condition,
    code,
    compiles,
    noTypographyViolations,
    hasRequiredStructure,
    issues,
    score,
    durationMs,
    iterations,
  };
}

function collectDoctorIssues(code: string): string[] {
  const tree = extractTree(code);
  if (tree == null) return [];
  return diagnose(tree).map((d) => `${d.rule}:${d.path}`);
}

// ─── Issue list for feedback (used in condition C runner) ───────────────────

/**
 * Compile + structure + @domphy/doctor diagnose + leftover static checks.
 * Condition C must keep iterating when typography regex is empty but the
 * tree still fails compile, structure, or doctor.
 */
export function detectIssuesForFeedback(
  code: string,
  task: Task,
  condition: Condition,
): string[] {
  const issues: string[] = [];

  if (!checkCompilesSync(code, condition)) {
    issues.push("does-not-compile");
  }

  if (!checkStructure(code, task, condition)) {
    const keywords = missingKeywords(code, task);
    const tags = missingTags(code, task);
    const detail = [...keywords, ...tags].join(", ");
    issues.push(detail ? `missing-structure(${detail})` : "missing-structure");
  }

  issues.push(...detectTypographyViolations(code));
  issues.push(...detectRemovedApi(code));

  const tree = extractTree(code);
  if (tree == null) {
    issues.push("doctor-tree-unavailable");
  } else {
    for (const diagnostic of diagnose(tree)) {
      issues.push(`${diagnostic.rule}:${diagnostic.path}`);
    }
  }

  return issues;
}

// ─── Doctor-feedback formatter (used in condition C) ────────────────────────

/** Generates a human-readable feedback string from @domphy/doctor + compile/structure. */
export function buildDoctorFeedback(issues: string[], code: string): string {
  const lines: string[] = ["@domphy/doctor report:"];

  if (issues.some((i) => i === "does-not-compile")) {
    lines.push(
      "- [error] does-not-compile: TypeScript/JS syntax failed esbuild transform.",
    );
  }

  const structure = issues.filter((i) => i.startsWith("missing-structure"));
  if (structure.length > 0) {
    lines.push(
      "- [error] missing-structure: Required tags/keywords (camelCase shipped API: inputText, inputSearch, inputCheckbox, unorderedList) are missing.",
      `  ${structure.join("; ")}`,
    );
  }

  const removed = issues.filter((i) => i === "removed-api");
  if (removed.length > 0) {
    lines.push(
      "- [error] removed-api: FormState, FieldState, or form()/field() patches from @domphy/ui were removed.",
      "  Fix: use createForm from @domphy/form/domphy instead.",
    );
  }

  const tree = extractTree(code);
  if (tree == null) {
    lines.push(
      "- [error] doctor-tree-unavailable: Could not evaluate a Domphy element tree from the code.",
      "  Export a default element (export default app) using { tag: children, style, $ } syntax.",
    );
  } else {
    // Actually call @domphy/doctor — this is the labeled "doctor" feedback.
    const report = validate(tree);
    const diagnostics = report.issues;
    if (diagnostics.length > 0) {
      lines.push(format(diagnostics));
    }
  }

  const typo = issues.filter((i) => i.startsWith("inline-typography"));
  if (typo.length > 0 && tree == null) {
    lines.push(
      `- [error] inline-typography: Found ${typo.length} inline typography style(s). NEVER set fontSize/fontWeight/lineHeight/letterSpacing/fontFamily/color in style:.`,
      "  Replacements:",
      "    style: { fontSize: '...' }    →  { span: '...', $: [small()] }  or  { p: '...', $: [paragraph()] }",
      "    style: { fontWeight: '...' }  →  { strong: '...', $: [strong()] }",
      "    style: { color: 'red' }       →  { span: '...', $: [small({ color: 'error' })] }",
      "    style: { color: '#...' }      →  color: (l) => themeColor(l, 'base', 'colorName')",
      "    style: { fontFamily: '...' }  →  remove entirely (theme owns the font stack)",
    );
  }

  const COMMON_PATCHES = [
    "button(",
    "card(",
    "heading(",
    "paragraph(",
    "small(",
    "link(",
    "strong(",
    "emphasis(",
    "code(",
    "formGroup(",
    "inputText(",
    "inputSearch(",
  ];
  const hasDomphyElements =
    code.includes("{ div:") ||
    code.includes("{ span:") ||
    code.includes("{ button:");
  const hasPatchUsage =
    code.includes("@domphy/ui") || COMMON_PATCHES.some((p) => code.includes(p));
  if (hasDomphyElements && !hasPatchUsage) {
    lines.push(
      "- [warn] no-patch-imports: Element tree found but no @domphy/ui patch imports detected.",
      "  Fix: import patches like button(), card(), heading(), paragraph() from @domphy/ui.",
    );
  }

  if (lines.length === 1) {
    lines.push("- No issues found. Output looks correct.");
  }

  return lines.join("\n");
}
