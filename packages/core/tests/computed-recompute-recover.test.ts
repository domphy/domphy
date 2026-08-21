// M08: a throw inside computed.fn after collector.reset() used to leave the
// computed dirty with 0 (or stale) upstream subs, so later get() could not
// recover and the error was only visible as a drain-queue console.error.
import { describe, expect, it, vi } from "vitest";
import {
  computed,
  effect,
  effectScope,
  flushSync,
  toState,
} from "../src/index.ts";

function listenerCount(source: {
  name?: string;
  _notifier?: {
    listenerCount?: (event: string) => number;
    _listeners?: Record<string, Set<unknown>>;
  };
}): number {
  const notifier = source._notifier;
  if (!notifier) return 0;
  if (typeof notifier.listenerCount === "function" && source.name) {
    return notifier.listenerCount(source.name);
  }
  const listeners = notifier._listeners;
  if (!listeners) return 0;
  let total = 0;
  for (const key in listeners) total += listeners[key].size;
  return total;
}

describe("computed: recompute throw recovery", () => {
  it("propagates the throw from get() and recovers on a later get()", () => {
    const fail = toState(true, "c-fail");
    const derived = computed(() => {
      if (fail.get()) throw new Error("boom");
      return 42;
    });

    expect(() => derived.get()).toThrow("boom");
    fail.set(false);
    expect(derived.get()).toBe(42);
  });

  it("a later get() after a throwing observed recompute returns the new value", () => {
    const source = toState(1, "c-obs");
    const derived = computed(() => {
      if (source.get() < 0) throw new Error("neg");
      return source.get() * 2;
    });

    const seen: number[] = [];
    effect(() => {
      try {
        seen.push(derived.get());
      } catch {
        seen.push(-1);
      }
    });
    expect(seen).toEqual([2]);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    source.set(-1);
    flushSync();
    source.set(4);
    flushSync();
    errorSpy.mockRestore();

    expect(derived.get()).toBe(8);
  });

  it("does not leak a poisoned computed into the next scope read", () => {
    const source = toState(true, "c-scope");
    const scope = effectScope();
    let derived!: ReturnType<typeof computed<number>>;
    scope.run(() => {
      derived = computed(() => {
        if (source.get()) throw new Error("nope");
        return 1;
      });
    });

    expect(() => derived.get()).toThrow("nope");
    source.set(false);
    expect(derived.get()).toBe(1);
    expect(listenerCount(source)).toBeGreaterThan(0);

    scope.stop();
  });
});
