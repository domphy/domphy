import { describe, expect, it } from "vitest";
import { deepClone } from "../src/helpers.ts";

// deepClone only deep-copies plain objects and arrays. Any value whose prototype
// is not Object.prototype (and is not an array) is treated as an opaque class
// instance and returned BY REFERENCE — this includes Date/RegExp/Map/Set and
// typed arrays. These tests pin that documented behavior so a regression that
// silently starts (or stops) cloning built-ins is caught.

describe("deepClone: built-in instances are passed through by reference", () => {
  it("returns the same Date instance (not a copy)", () => {
    const date = new Date("2026-01-01T00:00:00Z");
    const clone = deepClone(date);
    expect(clone).toBe(date);
  });

  it("returns the same RegExp instance", () => {
    const regexp = /abc/gi;
    expect(deepClone(regexp)).toBe(regexp);
  });

  it("returns the same Map instance", () => {
    const map = new Map([["a", 1]]);
    expect(deepClone(map)).toBe(map);
  });

  it("returns the same Set instance", () => {
    const set = new Set([1, 2, 3]);
    expect(deepClone(set)).toBe(set);
  });

  it("returns the same typed-array instance", () => {
    const typed = new Uint8Array([1, 2, 3]);
    expect(deepClone(typed)).toBe(typed);
  });

  it("keeps nested class instances by reference inside a cloned plain object", () => {
    const date = new Date("2026-06-24T00:00:00Z");
    const map = new Map([["k", "v"]]);
    const source = { date, map, label: "x" };

    const clone = deepClone(source);

    expect(clone).not.toBe(source); // plain object IS cloned
    expect(clone.date).toBe(date); // nested built-in kept by reference
    expect(clone.map).toBe(map);
    expect(clone.label).toBe("x");
  });
});

describe("deepClone: plain objects and arrays", () => {
  it("deep-clones nested plain objects (independent copy)", () => {
    const source = { a: { b: { c: 1 } }, list: [1, 2, { d: 3 }] };
    const clone = deepClone(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.a).not.toBe(source.a);
    expect(clone.a.b).not.toBe(source.a.b);
    expect(clone.list).not.toBe(source.list);
    expect(clone.list[2]).not.toBe(source.list[2]);

    clone.a.b.c = 99;
    expect(source.a.b.c).toBe(1); // mutation isolated
  });
});

describe("deepClone: cyclic objects (seen guard)", () => {
  it("clones a self-referential object without infinite recursion", () => {
    const source: any = { name: "root" };
    source.self = source; // direct cycle

    const clone = deepClone(source);

    expect(clone).not.toBe(source);
    expect(clone.name).toBe("root");
    // The cycle is preserved: the cloned `self` points back at the clone, not
    // the original — proving the WeakMap `seen` guard short-circuits the cycle.
    expect(clone.self).toBe(clone);
  });

  it("preserves shared references (same node cloned once)", () => {
    const shared = { value: 1 };
    const source = { left: shared, right: shared };

    const clone = deepClone(source);

    expect(clone.left).toBe(clone.right); // single clone reused, not duplicated
    expect(clone.left).not.toBe(shared);
  });
});
