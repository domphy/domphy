// Regression: a plain (untracked) computed .get() while dirty — after a
// dependency wrote but before the deferred reaction job ran — used to flip
// `dirty` off via a silent recompute(), turning the queued job into a no-op:
// already-subscribed downstream listeners (e.g. DOM bindings) were then NEVER
// told the value changed, permanently. Any state listener that reads the
// computed (a completely ordinary "log/derive on change" pattern) triggered it.

import { describe, expect, it } from "vitest";
import { computed, flushSync, toState } from "../src/index.ts";

describe("computed dirty read with downstream subscribers", () => {
  it("an untracked read between a dependency write and the reaction drain still notifies subscribers", () => {
    const count = toState(1);
    const doubled = computed(() => count.get() * 2);

    const received: number[] = [];
    expect(doubled.get((value: number) => received.push(value))).toBe(2);

    // An ordinary dependency listener that reads the computed untracked —
    // it runs inside the same notifier flush, BEFORE the reaction drain.
    count.get(() => {
      doubled.get();
    });

    count.set(5);
    flushSync();

    expect(doubled.get()).toBe(10);
    expect(received).toEqual([10]);
  });

  it("keeps the equality short-circuit: an unchanged recomputed value stays silent", () => {
    const count = toState(1);
    const parity = computed(() => count.get() % 2);

    const received: number[] = [];
    expect(parity.get((value: number) => received.push(value))).toBe(1);

    count.get(() => {
      parity.get(); // untracked dirty read, same as above
    });

    count.set(3); // parity unchanged (1 -> 1)
    flushSync();
    expect(received).toEqual([]);

    count.set(4); // parity changes (1 -> 0)
    flushSync();
    expect(received).toEqual([0]);
  });

  it("the initial lazy compute does not notify the subscriber that triggered it", () => {
    const count = toState(1);
    const doubled = computed(() => count.get() * 2);

    const received: number[] = [];
    doubled.get((value: number) => received.push(value));
    flushSync();
    expect(received).toEqual([]);
  });
});
