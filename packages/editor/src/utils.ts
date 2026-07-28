/**
 * Small shared helpers, ported from tiptap's `utilities/`.
 * `mergeAttributes` lives in src/extensions/ — it is an authoring helper, not
 * an engine one.
 */

import type { Attributes } from "./types.js";

/** Call `value` with `context` as `this` when it is a function, otherwise return it. */
export function callOrReturn<T>(
  value: T | ((...args: never[]) => T),
  context?: unknown,
  ...args: unknown[]
): T {
  if (typeof value === "function") {
    if (context === undefined) {
      return (value as (...callArgs: unknown[]) => T)(...args);
    }
    return (value as (...callArgs: unknown[]) => T).apply(context, args);
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Recursively merge `source` into `target`, returning a fresh object. */
export function mergeDeep<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const output: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = output[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      output[key] = mergeDeep(existing, value);
    } else {
      output[key] = value;
    }
  }
  return output as T;
}

/**
 * The document or shadow root that owns `element`.
 *
 * Anything reading focus or selection has to ask this root rather than the
 * owner document: inside a shadow tree `document.activeElement` is the host and
 * `document.getSelection()` reports the host as the anchor, so a document-scoped
 * lookup can never see a node inside the editor.
 */
export function rootOf(element: Node): Document | ShadowRoot {
  const root = element.getRootNode() as Document | ShadowRoot;
  return "host" in root ? root : (element.ownerDocument as Document);
}

/**
 * The selection for the tree `element` lives in.
 *
 * Chromium exposes `ShadowRoot#getSelection()`, which reports nodes inside the
 * shadow tree. Engines without it do not retarget the document selection in the
 * first place, so falling back to the document is correct there.
 */
export function selectionFor(element: Node): Selection | null {
  const root = rootOf(element) as {
    getSelection?: () => Selection | null;
  };
  return root.getSelection
    ? root.getSelection()
    : (element.ownerDocument as Document).getSelection();
}

/** Subset test: does `object` contain every entry of `subset`? */
export function objectIncludes(
  object: Attributes,
  subset: Attributes,
): boolean {
  const keys = Object.keys(subset);
  if (keys.length === 0) {
    return true;
  }
  return keys.every((key) => {
    const expected = subset[key];
    if (expected instanceof RegExp) {
      return expected.test(String(object[key]));
    }
    return expected === object[key];
  });
}
