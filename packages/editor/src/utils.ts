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
