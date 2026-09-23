import { AdditiveBlending } from "three";
import { resolve } from "./catalog.js";
import type { SceneChildren, SceneFunction, ThreeOptions } from "./types.js";

// Scene-level static analyzer — @domphy/doctor's shape applied to the
// three() option object, which doctor itself cannot see (a scene description
// is a plain option, not a DomphyElement). Every built-in rule below comes
// from a real, silent failure hit while building the domphy.com examples:
// wrong output or a blank canvas with no error anywhere.

export type SceneSeverity = "error" | "warning" | "info";

export interface SceneDiagnostic {
  /** Rule id, e.g. "legacy-light-intensity". */
  rule: string;
  severity: SceneSeverity;
  /** Human path to the offending node, e.g. "scene > mesh > pointsMaterial". */
  path: string;
  message: string;
  /** How to fix it. */
  hint?: string;
}

export interface SceneDiagnoseOptions {
  /** Whitelist of rule ids to run. */
  only?: string[];
  /** Blacklist of rule ids to skip. */
  exclude?: string[];
}

export interface SceneValidationSummary {
  error: number;
  warning: number;
  info: number;
  total: number;
}

export interface SceneValidationReport {
  ok: boolean;
  issues: SceneDiagnostic[];
  summary: SceneValidationSummary;
}

// Only point/spot lights switched to physical units in three r155 —
// RectAreaLight deliberately did NOT (its intensity stayed a small 0-5-ish
// value in three's own examples), so flagging it would be a false positive.
const POINTUAL_LIGHT_TAGS = new Set(["pointLight", "spotLight"]);

// Props on a scene node that are never the tag and never scene children.
const NON_TAG_KEYS = new Set([
  "args",
  "attach",
  "dispose",
  "raycast",
  "object",
  "on",
  "_key",
  "_doctorDisable",
]);

function nodeTag(description: Record<string, unknown>): string | null {
  for (const key of Object.keys(description)) {
    if (!NON_TAG_KEYS.has(key) && !key.startsWith("on")) return key;
  }
  return null;
}

// Resolve a possibly-reactive prop value the way doctor resolves reactive
// content: call it with a no-op listener and swallow anything that needed a
// live root. A value we cannot resolve statically is simply not checked.
function resolveValue(value: unknown): unknown {
  if (typeof value !== "function") return value;
  try {
    return (value as (listener: () => void, root: undefined) => unknown)(
      () => {},
      undefined,
    );
  } catch {
    return undefined;
  }
}

function isSuppressed(
  description: Record<string, unknown>,
  rule: string,
): boolean {
  const disabled = description._doctorDisable;
  if (disabled === true) return true;
  if (typeof disabled === "string") return disabled === rule;
  if (Array.isArray(disabled)) return disabled.includes(rule);
  return false;
}

type RuleCheck = (
  description: Record<string, unknown>,
  tag: string,
  path: string,
) => SceneDiagnostic[];

const legacyLightIntensity: RuleCheck = (description, tag, path) => {
  if (!POINTUAL_LIGHT_TAGS.has(tag)) return [];
  const intensity = resolveValue(description.intensity);
  if (typeof intensity !== "number") return [];
  if (intensity <= 0 || intensity > 5) return [];
  return [
    {
      rule: "legacy-light-intensity",
      severity: "warning",
      path,
      message: `<${tag}> intensity ${intensity} is low enough to look like a legacy pre-r155 value — three r155+ uses physical units for point/spot lights, so this light is nearly invisible.`,
      hint: "Point/spot lights take candela-scale intensity now: typical values are 40-100. Ambient/directional lights keep small values.",
    },
  ];
};

const additiveBlowout: RuleCheck = (description, tag, path) => {
  if (tag !== "pointsMaterial") return [];
  const blending = resolveValue(description.blending);
  if (blending !== AdditiveBlending) return [];
  // three's WebGLState only applies `material.blending` when the material is
  // transparent — the opaque pass forces NoBlending, so an explicitly opaque
  // material never blows out. An ABSENT or unresolvable `transparent` keeps
  // warning: the runtime value may be set imperatively elsewhere, and the
  // rule exists precisely because that combination shipped broken once.
  const transparent = resolveValue(description.transparent);
  if (transparent === false) return [];
  const size = resolveValue(description.size);
  const opacity = resolveValue(description.opacity);
  const numericSize = typeof size === "number" ? size : 1;
  const numericOpacity = typeof opacity === "number" ? opacity : 1;
  if (numericSize < 4 || numericOpacity < 0.6) return [];
  return [
    {
      rule: "additive-blowout",
      severity: "warning",
      path,
      message: `Additive-blended points with size ${numericSize} and opacity ${numericOpacity} — dense geometry will stack into blown-out white blobs.`,
      hint: "Additive sprites accumulate: keep size under ~4 or opacity under ~0.6, or brighten only a narrow band of points instead of all of them.",
    },
  ];
};

const RULES: RuleCheck[] = [legacyLightIntensity, additiveBlowout];

function checkUnknownTag(
  _description: Record<string, unknown>,
  tag: string,
  path: string,
): SceneDiagnostic[] {
  if (tag === "primitive") return [];
  if (resolve(tag)) return [];
  return [
    {
      rule: "unknown-tag",
      severity: "error",
      path,
      message: `"${tag}" resolves to nothing in the THREE namespace and is not registered via extend() — creating this node will throw at runtime.`,
      hint: "Check the spelling against the THREE class name (camelCase of it), or register the class with extend({ MyClass }).",
    },
  ];
}

// The reconciler's getSceneTag takes the FIRST own key of a description
// verbatim as its tag, while nodeTag above skips prop-shaped keys to FIND
// one. On well-formed input (tag first) the two agree; a props-first
// description ({ args: [...], mesh: [...] }) would pass the tag-based rules
// below against "mesh" yet throw at runtime resolving "args" as a THREE
// class. Flag the mismatch as its own error instead of silently passing —
// and skip the tag-based checks/children walk, since the node never gets
// created at runtime.
function checkTagNotFirst(
  description: Record<string, unknown>,
  tag: string | null,
  path: string,
): SceneDiagnostic[] {
  const firstKey = Object.keys(description)[0];
  if (tag && firstKey === tag) return [];
  const label = tag ?? firstKey ?? "(empty)";
  const childPath = path ? `${path} > ${label}` : label;
  if (!tag) {
    return [
      {
        rule: "tag-not-first",
        severity: "error",
        path: childPath,
        message: `Scene description has no tag key — only prop-shaped keys (${Object.keys(description).join(", ") || "none"}). Every scene node must lead with its THREE class tag.`,
        hint: "Add the tag as the first key, e.g. { mesh: [...children], ...props }.",
      },
    ];
  }
  return [
    {
      rule: "tag-not-first",
      severity: "error",
      path: childPath,
      message: `Scene description leads with "${firstKey}" but the tag is "${tag}" — the reconciler reads the first own key as the tag, so this node tries to construct "${firstKey}" from the THREE namespace and throws at runtime.`,
      hint: `Put the tag key first: { ${tag}: ..., ${firstKey}: ... }.`,
    },
  ];
}

// A child entry the reconciler's `normalizeChildren` would throw on: a
// string/number/boolean, or a nested array that was never spread. The most
// common way to produce one is writing props as the tag's VALUE —
// `{ meshStandardMaterial: { color: "orange" } }` instead of
// `{ meshStandardMaterial: null, color: "orange" }` — which makes "color" a
// child node whose own child is the string "orange". That shipped in this
// package's own docs four times before this rule existed; the runtime error it
// throws names the string, not the node that produced it.
function checkInvalidChild(child: unknown, path: string): SceneDiagnostic {
  const description = Array.isArray(child)
    ? "a nested array"
    : typeof child === "string"
      ? JSON.stringify(child)
      : `a ${typeof child}`;
  return {
    rule: "invalid-child",
    severity: "error",
    path,
    message: `Scene children must be description objects keyed by tag — got ${description}. Creating this node throws at runtime.`,
    hint: Array.isArray(child)
      ? "Spread it into the parent array instead (e.g. [...children, ...mapped])."
      : 'Props belong beside the tag, not inside it: { meshStandardMaterial: null, color: "orange" }, not { meshStandardMaterial: { color: "orange" } }.',
  };
}

function walkChildren(
  // `SceneFunction` too: `scene` may be a function, and resolveValue below
  // calls it to get the description it returns.
  children: SceneChildren | SceneFunction,
  path: string,
  out: SceneDiagnostic[],
  seen: Set<Record<string, unknown>> = new Set(),
): void {
  const resolved = resolveValue(children);
  if (!resolved) return;
  const list = Array.isArray(resolved) ? resolved : [resolved];
  for (const child of list) {
    // Falsy entries are the grammar's `cond && { mesh: ... }` opt-out.
    // `!child` exactly, not a null/undefined/false list: the reconciler's
    // normalizeChildren drops EVERY falsy item (0 and "" included), so
    // flagging those here would report an error the runtime never throws.
    if (!child) continue;
    if (Array.isArray(child) || typeof child !== "object") {
      out.push(checkInvalidChild(child, path));
      continue;
    }
    const description = child as Record<string, unknown>;
    // Cycle guard: a self-referencing description (a node listed inside its
    // own children) would otherwise recurse forever. Aliased (reused but
    // acyclic) nodes are skipped too — their diagnostics were already
    // reported at the first occurrence.
    if (seen.has(description)) continue;
    seen.add(description);
    const tag = nodeTag(description);
    const tagOrderIssues = checkTagNotFirst(description, tag, path);
    if (tagOrderIssues.length > 0) {
      for (const issue of tagOrderIssues) {
        if (!isSuppressed(description, issue.rule)) out.push(issue);
      }
      continue;
    }
    // tag is non-null here: checkTagNotFirst reports and short-circuits the
    // tagless case above.
    const resolvedTag = tag as string;
    const childPath = path ? `${path} > ${resolvedTag}` : resolvedTag;

    for (const issue of checkUnknownTag(description, resolvedTag, childPath)) {
      if (!isSuppressed(description, issue.rule)) out.push(issue);
    }
    for (const rule of RULES) {
      for (const issue of rule(description, resolvedTag, childPath)) {
        if (!isSuppressed(description, issue.rule)) out.push(issue);
      }
    }

    walkChildren(
      description[resolvedTag] as SceneChildren,
      childPath,
      out,
      seen,
    );
  }
}

function checkCamera(options: ThreeOptions, out: SceneDiagnostic[]): void {
  const camera = options.camera;
  if (!camera || "instance" in camera) return;
  const position = resolveValue(camera.position);
  if (!Array.isArray(position)) return;
  const [x, y] = position as number[];
  const offAxis = Math.abs(x ?? 0) > 0.001 || Math.abs(y ?? 0) > 0.001;
  // Exemptions: onCreated can aim imperatively, and an explicit `rotation`
  // or `lookAt` prop aims the camera declaratively.
  if (
    !offAxis ||
    options.onCreated ||
    camera.rotation !== undefined ||
    camera.lookAt !== undefined
  )
    return;
  out.push({
    rule: "camera-missing-lookat",
    severity: "warning",
    path: "camera",
    message: `Camera position [${position.join(", ")}] is off-axis but nothing aims it — a PerspectiveCamera keeps looking down its default -Z axis and the subject lands off-frame.`,
    hint: "Add onCreated: (root) => root.camera.lookAt(0, 0, 0) (or wherever the subject is).",
  });
}

/**
 * Statically analyze a three() option object for the silent scene mistakes
 * that produce a wrong or empty render with no error: unknown tags, props
 * written as the tag's value, legacy low light intensities (three r155+
 * physical units), additive particle blowout, and an off-axis camera that
 * never looks at its subject.
 *
 * Same contract shape as `@domphy/doctor`: returns a list of diagnostics;
 * suppress per node with `_doctorDisable: true | "rule-id" | string[]`.
 */
export function diagnose(
  options: ThreeOptions,
  diagnoseOptions: SceneDiagnoseOptions = {},
): SceneDiagnostic[] {
  const issues: SceneDiagnostic[] = [];
  checkCamera(options, issues);
  walkChildren(options.scene, "scene", issues);

  const { only, exclude } = diagnoseOptions;
  return issues.filter((issue) => {
    if (only && !only.includes(issue.rule)) return false;
    if (exclude?.includes(issue.rule)) return false;
    return true;
  });
}

/** diagnose() + a pass/fail summary — `ok` is true when no error-severity issues exist. */
export function validate(
  options: ThreeOptions,
  diagnoseOptions: SceneDiagnoseOptions = {},
): SceneValidationReport {
  const issues = diagnose(options, diagnoseOptions);
  const summary: SceneValidationSummary = {
    error: 0,
    warning: 0,
    info: 0,
    total: issues.length,
  };
  for (const issue of issues) summary[issue.severity] += 1;
  return { ok: summary.error === 0, issues, summary };
}
