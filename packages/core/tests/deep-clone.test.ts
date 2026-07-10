import { describe, expect, it } from "vitest";
import { deepClone } from "../src/helpers.ts";

// deepClone deep-copies plain objects, arrays, and a fixed set of built-in
// container types (Date/RegExp/Map/Set/TypedArray/ArrayBuffer) — those checks
// must run BEFORE the class-instance bailout, otherwise their non-Object
// prototype would make the bailout return them by reference instead. Any
// OTHER value whose prototype is not Object.prototype (arbitrary class
// instances such as State/ElementNode) is treated as opaque and returned BY
// REFERENCE. These tests pin both halves of that contract so a regression
// (either built-ins going dead again, or class instances starting to get
// cloned) is caught.

class CustomInstance {
  constructor(public label: string) {}
}

describe("deepClone: built-in container types are deep-cloned", () => {
  it("clones a Date into a new instance with the same time value", () => {
    const date = new Date("2026-01-01T00:00:00Z");
    const clone = deepClone(date);

    expect(clone).not.toBe(date);
    expect(clone).toEqual(date);
    expect(clone.getTime()).toBe(date.getTime());
  });

  it("clones a RegExp into a new instance with the same source/flags", () => {
    const regexp = /abc/gi;
    const clone = deepClone(regexp);

    expect(clone).not.toBe(regexp);
    expect(clone.source).toBe(regexp.source);
    expect(clone.flags).toBe(regexp.flags);
  });

  it("clones a Map into a new, independent Map", () => {
    const map = new Map([["a", 1]]);
    const clone = deepClone(map);

    expect(clone).not.toBe(map);
    expect(clone).toEqual(map);

    clone.set("a", 99);
    expect(map.get("a")).toBe(1); // mutation isolated
  });

  it("clones a Set into a new, independent Set", () => {
    const set = new Set([1, 2, 3]);
    const clone = deepClone(set);

    expect(clone).not.toBe(set);
    expect(clone).toEqual(set);

    clone.add(4);
    expect(set.has(4)).toBe(false); // mutation isolated
  });

  it("clones a typed array into a new instance of the same type", () => {
    const typed = new Uint8Array([1, 2, 3]);
    const clone = deepClone(typed);

    expect(clone).not.toBe(typed);
    expect(clone).toBeInstanceOf(Uint8Array);
    expect(Array.from(clone)).toEqual([1, 2, 3]);

    clone[0] = 99;
    expect(typed[0]).toBe(1); // mutation isolated
  });

  it("clones an ArrayBuffer into a new, independent buffer", () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const clone = deepClone(buffer);

    expect(clone).not.toBe(buffer);
    expect(new Uint8Array(clone)).toEqual(new Uint8Array(buffer));
  });

  it("keeps nested built-ins cloned inside a cloned plain object", () => {
    const date = new Date("2026-06-24T00:00:00Z");
    const map = new Map([["k", "v"]]);
    const source = { date, map, label: "x" };

    const clone = deepClone(source);

    expect(clone).not.toBe(source); // plain object IS cloned
    expect(clone.date).not.toBe(date); // nested built-in IS cloned too
    expect(clone.date.getTime()).toBe(date.getTime());
    expect(clone.map).not.toBe(map);
    expect(clone.map).toEqual(map);
    expect(clone.label).toBe("x");
  });
});

describe("deepClone: arbitrary class instances are passed through by reference", () => {
  it("returns the same custom class instance (not a copy)", () => {
    const instance = new CustomInstance("state-like");
    expect(deepClone(instance)).toBe(instance);
  });

  it("keeps a nested custom class instance by reference inside a cloned plain object", () => {
    const instance = new CustomInstance("nested");
    const source = { instance, label: "x" };

    const clone = deepClone(source);

    expect(clone).not.toBe(source); // plain object IS cloned
    expect(clone.instance).toBe(instance); // class instance kept by reference
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
