import { transform } from "esbuild";
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
  /** 0–100 */
  score: number;
  durationMs: number;
  /** Condition C only: how many LLM rounds were needed. */
  iterations?: number;
}

export type Condition = "A" | "B" | "C" | "D";

// ─── Code extraction ────────────────────────────────────────────────────────

/** Pull the first TypeScript/JavaScript code block from an LLM reply. */
export function extractCode(reply: string): string {
  const fenced = reply.match(/```(?:ts|tsx|typescript|js|javascript)?\n([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Fallback: if no fences, treat whole reply as code.
  return reply.trim();
}

// ─── Compile check ──────────────────────────────────────────────────────────

async function checkCompiles(code: string, condition: Condition): Promise<boolean> {
  const loader = condition === "D" ? "tsx" : "ts";
  try {
    await transform(code, {
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

// ─── Static analysis ────────────────────────────────────────────────────────

// True typography violations: inline style properties for TEXT that Domphy
// requires you to use patches (heading/paragraph/small/link/etc.) for.
// Layout-only properties (margin, padding, gap, display, flex…) are allowed
// as inline style because Domphy has no layout patch for them.
const TYPOGRAPHY_PATTERNS: RegExp[] = [
  /fontSize\s*:\s*["'`\d]/,          // fontSize: "16px" — use heading()/paragraph()/small()
  /\bcolor\s*:\s*["'`#](?!ariant)/,  // color: "#333"    — use themeColor() or patch
  /lineHeight\s*:\s*["'`\d]/,        // lineHeight: 1.5   — use paragraph()/heading()
  /fontWeight\s*:\s*["'`\d]/,        // fontWeight: 700   — use strong()/heading()
  /fontFamily\s*:\s*["'`]/,          // fontFamily: "..."  — use theme
  /letterSpacing\s*:\s*["'`\d]/,     // letterSpacing: ...— use patch
];

const REMOVED_API_PATTERNS: RegExp[] = [
  /\bFormState\b/,
  /\bFieldState\b/,
  /\bfrom ['"]@domphy\/ui['"].*\bform\b/,
  /\bfrom ['"]@domphy\/ui['"].*\bfield\b/,
];

function detectTypographyViolations(code: string): string[] {
  return TYPOGRAPHY_PATTERNS.filter((p) => p.test(code)).map(
    (p) => `inline-typography(${p.source.replace(/\\.*/g, "").substring(0, 20)})`,
  );
}

function detectRemovedApi(code: string): string[] {
  return REMOVED_API_PATTERNS.filter((p) => p.test(code)).map(
    () => "removed-api",
  );
}

function checkStructure(code: string, task: Task, condition: Condition): boolean {
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

// ─── Scoring ─────────────────────────────────────────────────────────────────

function computeScore(
  compiles: boolean,
  noTypo: boolean,
  structure: boolean,
  condition: Condition,
): number {
  if (condition === "D") {
    // React baseline: compile + structure (no typography rule)
    return (compiles ? 50 : 0) + (structure ? 50 : 0);
  }
  return (compiles ? 40 : 0) + (noTypo ? 30 : 0) + (structure ? 30 : 0);
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

  const [compiles] = await Promise.all([checkCompiles(code, condition)]);

  const typoIssues = condition === "D" ? [] : detectTypographyViolations(code);
  const removedApiIssues = condition === "D" ? [] : detectRemovedApi(code);
  const noTypographyViolations = typoIssues.length === 0;
  const hasRequiredStructure = checkStructure(code, task, condition);

  const issues = [...typoIssues, ...removedApiIssues];

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

// ─── Issue list for feedback (used in condition C runner) ───────────────────

/** Returns detected issue labels for a given code string (used by runner for condition C loop). */
export function detectIssuesForFeedback(code: string): string[] {
  return [...detectTypographyViolations(code), ...detectRemovedApi(code)];
}

// ─── Doctor-feedback formatter (used in condition C) ────────────────────────

/** Generates a human-readable feedback string from static analysis for LLM self-correction. */
export function buildDoctorFeedback(issues: string[], code: string): string {
  const lines: string[] = ["@domphy/doctor report:"];

  const typo = issues.filter((i) => i.startsWith("inline-typography"));
  if (typo.length > 0) {
    lines.push(
      `- [error] inline-typography: Found ${typo.length} inline typography style(s).`,
      "  Fix: use patches like heading(), paragraph(), small(), link(), strong() instead of style properties fontSize/color/lineHeight/fontWeight.",
    );
  }

  const removed = issues.filter((i) => i === "removed-api");
  if (removed.length > 0) {
    lines.push(
      "- [error] removed-api: FormState, FieldState, or form()/field() patches from @domphy/ui were removed.",
      "  Fix: use createForm from @domphy/form/domphy instead.",
    );
  }

  // Check for missing patch imports
  if (code.includes("{ div:") || code.includes("{ span:") || code.includes("{ button:")) {
    if (!code.includes("@domphy/ui") && !code.includes("button(") && !code.includes("card(")) {
      lines.push(
        "- [warn] no-patch-imports: Element tree found but no @domphy/ui patch imports detected.",
        "  Fix: import patches like button(), card(), heading(), paragraph() from @domphy/ui.",
      );
    }
  }

  if (lines.length === 1) {
    lines.push("- No issues found. Output looks correct.");
  }

  return lines.join("\n");
}
