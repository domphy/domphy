import { type ReadableState, State, type ValueListener } from "./classes/State.js";
import { addEvent, addHook, deepClone } from "./helpers.js";
import type { DomphyElement, EventName, Handler, HookMap } from "./types.js";

export function merge(
  source: Record<string, any> = {},
  target: Record<string, any> = {},
): Record<string, any> {
  const comma = [
    "animation",
    "transition",
    "boxShadow",
    "textShadow",
    "background",
    "fontFamily",
  ];
  const space = ["class", "rel", "transform", "acceptCharset", "sandbox"];
  const adjacent = ["content"];
  if (
    Object.prototype.toString.call(target) === "[object Object]" &&
    Object.getPrototypeOf(target) === Object.prototype
  ) {
    // plainjs not class instance
    target = deepClone(target);
  }

  for (const key in target) {
    const value = target[key];
    if (value === undefined || value === null || value === "") continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      if (typeof source[key] === "object") {
        source[key] = merge(source[key], value);
      } else {
        source[key] = value;
      }
    } else {
      if (comma.includes(key)) {
        if (typeof source[key] === "function" || typeof value === "function") {
          const old = source[key];
          source[key] = (listener: Handler) => {
            const val1 = typeof old === "function" ? old(listener) : old;
            const val2 = typeof value === "function" ? value(listener) : value;
            return [val1, val2].filter((e) => e).join(", ");
          };
        } else {
          source[key] = [source[key], value].filter((e) => e).join(", ");
        }
      } else if (adjacent.includes(key)) {
        if (typeof source[key] === "function" || typeof value === "function") {
          const old = source[key];
          source[key] = (listener: Handler) => {
            const val1 = typeof old === "function" ? old(listener) : old;
            const val2 = typeof value === "function" ? value(listener) : value;
            return [val1, val2].filter((e) => e).join("");
          };
        } else {
          source[key] = [source[key], value].filter((e) => e).join("");
        }
      } else if (space.includes(key)) {
        if (typeof source[key] === "function" || typeof value === "function") {
          const old = source[key];
          source[key] = (listener: Handler) => {
            const val1 = typeof old === "function" ? old(listener) : old;
            const val2 = typeof value === "function" ? value(listener) : value;
            return [val1, val2].filter((e) => e).join(" ");
          };
        } else {
          source[key] = [source[key], value].filter((e) => e).join(" ");
        }
      } else if (key.startsWith("on")) {
        const name = key.replace("on", "").toLowerCase() as EventName;
        addEvent(source as DomphyElement, name, value);
      } else if (key.startsWith("_on")) {
        const name = key.replace("_on", "") as keyof HookMap;
        addHook(source as DomphyElement, name, value);
      } else {
        source[key] = value;
      }
    }
  }
  return source;
}

export function hashString(str: string = ""): string {
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV prime, keep 32-bit unsigned
  }
  return String.fromCharCode(97 + (hash % 26)) + hash.toString(16);
}

export function toState<T>(
  val: T | State<T> | ReadableState<T>,
  name?: string,
): State<T> {
  return val instanceof State || (val as any)?._isState
    ? (val as State<T>)
    : new State<T>(val as T, name);
}

// Returns true when `value` is a State or any ReadableState (including
// Computed<T>). Use this as a type guard when writing utilities that accept
// either a raw value or a reactive source.
//
//   function bindOrUse<T>(src: T | ReadableState<T>) {
//     if (isState(src)) return src.get()
//     return src
//   }
export function isState<T = unknown>(value: unknown): value is ReadableState<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as any)._isState === true
  );
}

// Wraps a State or ReadableState in a read-only view. The returned object exposes
// only `.get()` — callers cannot call `.set()`. Useful for exposing internal
// state from a module or factory without granting write access.
//
//   const _count = toState(0)
//   export const count = readonly(_count)  // consumers can read, not write
//   export const increment = () => _count.set(_count.get() + 1)
export function readonly<T>(source: ReadableState<T>): ReadableState<T> {
  return {
    _isState: true as const,
    get(listener?: ValueListener<T>): T {
      return source.get(listener);
    },
  };
}
