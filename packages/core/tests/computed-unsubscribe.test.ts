// Computed auto-unsubscribe: when a computed's LAST downstream listener
// releases, the computed drops its upstream dependency subscriptions
// (previously they stayed subscribed forever unless an effectScope/dispose
// released them). The next read recomputes and re-subscribes symmetrically,
// so no invalidation is lost.
import { describe, expect, it } from "vitest";
import { computed, effect, flushSync } from "../src/classes/Reactive.ts";
import type { ValueListener } from "../src/classes/State.ts";
import { toState } from "../src/utils.ts";

// Subscribe to a computed the way the DOM binding paths do, capturing the
// release handle Notifier hands out via listener.onSubscribe.
function subscribe<T>(source: { get(l?: ValueListener<T>): T }) {
  let release: (() => void) | undefined;
  const calls: T[] = [];
  const listener = ((value: T) => calls.push(value)) as ValueListener<T>;
  (listener as any).onSubscribe = (r: () => void) => {
    release = r;
  };
  source.get(listener);
  return {
    calls,
    release: () => release?.(),
  };
}

function upstreamCount(state: unknown): number {
  const notifier = (state as any)._notifier;
  return notifier ? notifier.listenerCount((state as any).name) : 0;
}

describe("computed: upstream subscription released when unobserved", () => {
  it("upstream listenerCount returns to 0 after the last downstream release", () => {
    const source = toState(1);
    const doubled = computed(() => source.get() * 2);

    const sub = subscribe(doubled);
    expect(upstreamCount(source)).toBe(1);

    sub.release();
    expect(upstreamCount(source)).toBe(0);
  });

  it("re-reading after the release re-subscribes upstream and returns correct values", () => {
    const source = toState(1);
    const doubled = computed(() => source.get() * 2);

    const sub = subscribe(doubled);
    sub.release();
    expect(upstreamCount(source)).toBe(0);

    // Write while fully unobserved — nothing is subscribed, so no
    // invalidation can arrive; the next read must still see it.
    source.set(21);
    expect(doubled.get()).toBe(42);
    // The recompute re-armed the upstream subscription (warm cache).
    expect(upstreamCount(source)).toBe(1);
  });

  it("a re-subscribed computed tracks changes and notifies again", () => {
    const source = toState(1);
    const doubled = computed(() => source.get() * 2);

    subscribe(doubled).release();

    const sub2 = subscribe(doubled);
    expect(upstreamCount(source)).toBe(1);
    source.set(5);
    flushSync();
    expect(sub2.calls).toEqual([10]);
  });

  it("diamond chains collapse upstream and re-arm with correct values", () => {
    const s = toState(1);
    const a = computed(() => s.get() + 1);
    const b = computed(() => s.get() * 10);
    const c = computed(() => a.get() + b.get());

    const sub = subscribe(c);
    // c subscribed to a and b; a and b each subscribed to s.
    expect(upstreamCount(s)).toBe(2);
    expect((a as any)._notifier.listenerCount("computed")).toBe(1);
    expect((b as any)._notifier.listenerCount("computed")).toBe(1);

    sub.release();
    // The collapse cascades: c drops a/b, a/b drop s.
    expect((a as any)._notifier.listenerCount("computed")).toBe(0);
    expect((b as any)._notifier.listenerCount("computed")).toBe(0);
    expect(upstreamCount(s)).toBe(0);

    // Change the root while the whole chain is collapsed, then re-read.
    s.set(2);
    expect(c.get()).toBe(3 + 20);
    expect(upstreamCount(s)).toBe(2);
  });

  it("an observed computed still recomputes once per burst and notifies", () => {
    const x = toState(1);
    const y = toState(2);
    let runs = 0;
    const sum = computed(() => {
      runs++;
      return x.get() + y.get();
    });

    const sub = subscribe(sum);
    expect(sum.get()).toBe(3);
    const runsAfterInit = runs;

    x.set(10);
    y.set(20);
    flushSync();
    expect(sub.calls).toEqual([30]);
    expect(runs).toBe(runsAfterInit + 1); // single recompute for the burst
  });

  it("an effect releasing its computed dependency frees the upstream state", () => {
    const source = toState(1);
    const doubled = computed(() => source.get() * 2);

    const seen: number[] = [];
    const dispose = effect(() => {
      seen.push(doubled.get());
    });
    expect(upstreamCount(source)).toBe(1);

    source.set(4);
    flushSync();
    expect(seen).toEqual([2, 8]);

    dispose();
    expect(upstreamCount(source)).toBe(0);
  });

  it("equality short-circuit still applies across a release/re-subscribe cycle", () => {
    const source = toState(2);
    const parity = computed(() => source.get() % 2); // 2 -> 0, 4 -> 0

    const sub1 = subscribe(parity);
    sub1.release();

    const sub2 = subscribe(parity);
    sub2.calls.length = 0;
    source.set(4); // parity unchanged: 0 === 0
    flushSync();
    expect(sub2.calls).toEqual([]); // no downstream churn for an equal value
  });
});
