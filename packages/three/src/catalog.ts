import * as THREE from "three";
import type { Constructable } from "./types.js";

// Version-agnostic tag resolution (locked in SPEC.md): no pre-populated class
// catalog. A tag resolves by reflection against the user registry first,
// then against the live THREE namespace. This means the package works with
// whatever three.js version is installed, without ever hard-coding a class
// list.
let registry: Record<string, Constructable> = {};

function toPascalCase(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

// Register user/3rd-party constructors (e.g. drei-style helpers, custom
// shaders) so tags resolve them the same way built-in THREE tags resolve.
export function extend(objects: Record<string, Constructable>): void {
  Object.assign(registry, objects);
}

// Resolve a scene tag ("mesh", "boxGeometry", ...) to its constructor.
// Registry entries win over the THREE namespace. Unknown tags return null —
// callers (reconciler.ts) decide how to report that.
export function resolve(tag: string): Constructable | null {
  const name = toPascalCase(tag);
  const fromRegistry = registry[name];
  if (fromRegistry) return fromRegistry;
  // The THREE namespace also exports non-constructors whose PascalCase names
  // collide with the tag grammar (AdditiveBlending = 2, MOUSE = object,
  // REVISION = string). Accepting them would defer the failure to a runtime
  // `TagClass is not a constructor` instead of the friendly "not part of the
  // THREE namespace!" error — so only functions count as tags here. (Falsy
  // entries like NoBlending = 0 already fell through to null; the typeof
  // check makes the rejection consistent.) Registry entries from extend()
  // are trusted as-is: the user explicitly opted them in.
  const fromThree: unknown = (THREE as unknown as Record<string, unknown>)[
    name
  ];
  return typeof fromThree === "function" ? (fromThree as Constructable) : null;
}

// Test-only escape hatch: reset the registry between test cases.
export function clearRegistry(): void {
  registry = {};
}
