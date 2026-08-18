// Regression coverage for diamond-dependency execution: an effect that
// depends on BOTH a state and a computed derived from that state must run
// exactly ONCE per change, with consistent values. Before the version-skip
// in Collector, the computed's notifier flush re-woke the effect with the
// very value the effect's own run had just recomputed via the read — a
// second, identical run (duplicate side effects per change).
import { describe, expect, it, vi } from "vitest";
import { computed, effect, flushSync, watch } from "../src/classes/Reactive.ts";
import { toState } from "../src/utils.ts";

describe("diamond dependency execution", () => {
  it("effect reading a state AND a computed of that state runs once per change", () => {
    const a = toState(1);
    const c = computed(() => a.get() * 2);
    const seen: Array<[number, number]> = [];
    effect(() => {
      seen.push([a.get(), c.get()]);
    });
    expect(seen).toEqual([[1, 2]]);

    a.set(2);
    flushSync();
    // Exactly one additional run, with consistent (non-torn) values.
    expect(seen).toEqual([
      [1, 2],
      [2, 4],
    ]);

    a.set(3);
    flushSync();
    expect(seen).toEqual([
      [1, 2],
      [2, 4],
      [3, 6],
    ]);
  });

  it("effect reading TWO computeds of the same state runs once per change", () => {
    const a = toState(1);
    const c1 = computed(() => a.get() * 2);
    const c2 = computed(() => a.get() + 10);
    const seen: Array<[number, number]> = [];
    effect(() => {
      seen.push([c1.get(), c2.get()]);
    });
    a.set(2);
    flushSync();
    expect(seen).toEqual([
      [2, 11],
      [4, 12],
    ]);
  });

  it("effect reading state + both computeds (full diamond) runs once per change", () => {
    const a = toState(1);
    const c1 = computed(() => a.get() * 2);
    const c2 = computed(() => a.get() + 10);
    let runs = 0;
    effect(() => {
      runs++;
      a.get();
      c1.get();
      c2.get();
    });
    a.set(2);
    flushSync();
    expect(runs).toBe(2); // initial + one update
  });

  it("still re-runs when the computed changes again after a consumed version", () => {
    const a = toState(1);
    const c = computed(() => a.get() * 2);
    const seen: number[] = [];
    effect(() => {
      seen.push(c.get() + a.get());
    });
    a.set(2);
    flushSync();
    a.set(3);
    flushSync();
    expect(seen).toEqual([3, 6, 9]);
  });

  it("watch on a computed fires once per change in a diamond", () => {
    const a = toState(1);
    const c = computed(() => a.get() * 2);
    const calls: Array<[number, number | undefined]> = [];
    watch(c, (n, prev) => calls.push([n, prev]));
    // A sibling effect creates the diamond interleaving (direct + derived dep).
    effect(() => {
      a.get();
      c.get();
    });
    a.set(2);
    flushSync();
    expect(calls).toEqual([[4, 2]]);
  });

  it("a pure computed chain (no diamond) still runs once per change", () => {
    const a = toState(1);
    const c = computed(() => a.get() * 2);
    const values: number[] = [];
    effect(() => {
      values.push(c.get());
    });
    a.set(2);
    flushSync();
    expect(values).toEqual([2, 4]);
  });

  it("plain State notifications are not version-skipped when the value changes", () => {
    const a = toState(1);
    let runs = 0;
    effect(() => {
      runs++;
      a.get();
    });
    a.set(1); // Object.is equal — no notify
    flushSync();
    expect(runs).toBe(1);
    a.set(2);
    flushSync();
    expect(runs).toBe(2);
  });

  it("chained computeds downstream of a diamond stay consistent", () => {
    const a = toState(1);
    const c1 = computed(() => a.get() * 2);
    const c2 = computed(() => c1.get() + 1);
    const seen: Array<[number, number]> = [];
    effect(() => {
      seen.push([a.get(), c2.get()]);
    });
    a.set(2);
    flushSync();
    expect(seen).toEqual([
      [1, 3],
      [2, 5],
    ]);
  });

  it("a disposed effect is not revived by a pending skipped wake", () => {
    const a = toState(1);
    const c = computed(() => a.get() * 2);
    const fn = vi.fn();
    const dispose = effect(() => {
      fn();
      a.get();
      c.get();
    });
    a.set(2);
    dispose();
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
