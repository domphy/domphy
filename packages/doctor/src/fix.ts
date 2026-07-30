import {
  type DiagnoseOptions,
  type ValidationReport,
  validate,
} from "./diagnose.js";
import { findTag, isPlainObject, VOID } from "./shared.js";

// Autofix for Domphy element trees. We ONLY apply transforms that are provably
// lossless — they fix structurally-invalid input without guessing intent. Every
// other diagnostic (missing/unstable keys, inline typography, literal colors,
// unknown tones/tags) needs semantic intent the tree does not carry, so applying
// a "fix" would corrupt the author's meaning (e.g. an index key is itself the
// unstable-key anti-pattern). Those are returned in `report` for the model or a
// human to resolve. The fixer set is a registry so safe transforms can be added.

// Structural clone that preserves functions (reactive `(listener) => …` values)
// by reference — a JSON clone would drop them. Primitives pass through.
// The memo map keeps shared references shared and makes circular structures
// survivable (the clone preserves the cycle instead of recursing forever).
function cloneTree(
  value: unknown,
  seen = new Map<unknown, unknown>(),
): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const out: unknown[] = [];
    seen.set(value, out);
    for (const item of value) out.push(cloneTree(item, seen));
    return out;
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) return seen.get(value);
    const out: Record<string, unknown> = {};
    seen.set(value, out);
    for (const key in value) out[key] = cloneTree(value[key], seen);
    return out;
  }
  return value;
}

/** One applied lossless fix. */
export interface AppliedFix {
  rule: string;
  /** Human path to the node, e.g. "div > input". */
  path: string;
  message: string;
}

/** Result of {@link fix}: the corrected tree, what was applied, and what remains. */
export interface FixResult {
  /** A deep copy of the input with lossless fixes applied (functions preserved). */
  tree: unknown;
  /** The lossless fixes that were applied. */
  applied: AppliedFix[];
  /** validate() run on the fixed tree — `report.issues` are the manual remainder. */
  report: ValidationReport;
}

/**
 * Applies every provably-lossless fix to a copy of the tree and returns the
 * result plus a fresh validation report. Currently fixes `void-content` (a void
 * tag like input/img/br cannot have children, so its content is set to null).
 * Issues that need intent are left untouched and surface in `report` — this
 * includes `raw-spacing-value` and `raw-theme-value` (require semantic choices)
 * and key rules (require stable identity from data, not the tree shape).
 */
export function fix(root: unknown, options: DiagnoseOptions = {}): FixResult {
  const tree = cloneTree(root);
  const applied: AppliedFix[] = [];
  walkFix(tree, "", applied);
  return { tree, applied, report: validate(tree, options) };
}

function walkFix(
  node: unknown,
  path: string,
  applied: AppliedFix[],
  seen = new Set<unknown>(),
): void {
  // Cycle guard — a malformed tree can reference itself; never recurse twice
  // into the same object/array (see walk() in diagnose.ts).
  if (Array.isArray(node)) {
    if (seen.has(node)) return;
    seen.add(node);
    for (const [index, child] of node.entries()) {
      walkFix(child, `${path}[${index}]`, applied, seen);
    }
    return;
  }
  if (!isPlainObject(node)) return;
  if (seen.has(node)) return;
  seen.add(node);

  const tag = findTag(node);
  if (!tag) return;
  const here = path ? `${path} > ${tag}` : tag;

  // void-content: a void tag renders no children, so any content is invalid and
  // cannot be rendered — clearing it to null is lossless.
  if (VOID.has(tag) && node[tag] !== null && node[tag] !== undefined) {
    node[tag] = null;
    applied.push({
      rule: "void-content",
      path: here,
      message: `Void tag <${tag}> cannot have content — cleared to null.`,
    });
  }

  walkFix(node[tag], here, applied, seen);
}
