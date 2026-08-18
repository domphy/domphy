// M09: computed dispose (via effectScope.stop) must lock get() so a later
// read does not re-subscribe upstream outside the stopped scope.
import { describe, expect, it } from "vitest";
import { computed, effectScope, flushSync, toState } from "../src/index.ts";

function listenerCount(source: {
  name?: string;
  _notifier?: { listenerCount?: (event: string) => number; _listeners?: Record<string, Set<unknown>> };
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

describe("computed.dispose: get() after dispose does not resubscribe", () => {
  it("a dirty get() after stop() does not re-subscribe the source", () => {
    const source = toState(1, "lock-src");
    const scope = effectScope();
    let derived!: ReturnType<typeof computed<number>>;
    scope.run(() => {
      derived = computed(() => source.get() * 2);
    });

    expect(derived.get()).toBe(2);
    expect(listenerCount(source)).toBe(1);

    source.set(5);
    scope.stop();
    expect(listenerCount(source)).toBe(0);

    derived.get();
    expect(listenerCount(source)).toBe(0);

    source.set(9);
    flushSync();
    expect(listenerCount(source)).toBe(0);
  });

  it("get() after dispose of an unread computed does not subscribe", () => {
    const source = toState(3, "lock-unread");
    const scope = effectScope();
    let derived!: ReturnType<typeof computed<number>>;
    scope.run(() => {
      derived = computed(() => source.get() + 1);
    });
    expect(listenerCount(source)).toBe(0);

    scope.stop();
    derived.get();
    expect(listenerCount(source)).toBe(0);
  });
});
